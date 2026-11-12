#!/usr/bin/env python3
"""Build a verified local checkpoint; never upload or overwrite a prior backup."""
from pathlib import Path, PurePosixPath
from datetime import datetime, timezone
import argparse
import hashlib
import json
import shutil
import re
import subprocess
import zipfile


def digest(data):
    return hashlib.sha256(data).hexdigest()


def build(base, output, browser_report=None, originals=None):
    root = Path(__file__).resolve().parent.parent
    node = shutil.which("node")
    if not node:
        raise RuntimeError("Existing Node.js is required; no installation is attempted.")
    check = subprocess.run([node, "scripts/check-local.mjs"], cwd=root, capture_output=True, text=True, encoding="utf-8")
    print(check.stdout, end="")
    if check.returncode:
        raise RuntimeError("Checks failed. No checkpoint created.\n" + check.stderr)
    count = re.search(r"(?:#|ℹ) tests (\d+)", check.stdout)
    if not count:
        raise RuntimeError("Cannot verify the test count. No checkpoint created.")
    built = subprocess.run([node, "scripts/build-standalone.mjs"], cwd=root, capture_output=True, text=True, encoding="utf-8")
    print(built.stdout, end="")
    if built.returncode:
        raise RuntimeError("Portable build failed. No checkpoint created.\n" + built.stderr)
    result = json.loads(built.stdout.strip().splitlines()[-1])
    playable = Path(result["directory"]).resolve()
    if not playable.is_relative_to(root / "artifacts"):
        raise RuntimeError("Unexpected playable output directory.")

    browser = None
    if browser_report:
        browser = json.loads(browser_report.read_text(encoding="utf-8"))
        if browser.get("artifact_sha256") != result["sha256"] or browser.get("version") != result["version"]:
            raise RuntimeError("Browser QA report belongs to a different artifact.")
    # Record actual passes and platform skips, not only total discovered tests.
    counts = {}
    for key in ("tests", "pass", "fail", "skipped", "cancelled"):
        match = re.search(r"(?:#|ℹ) " + key + r" (\d+)", check.stdout)
        if not match:
            raise RuntimeError("Missing test result count: " + key)
        counts[key] = int(match.group(1))
    if counts["fail"] or counts["cancelled"] or counts["tests"] != counts["pass"] + counts["skipped"]:
        raise RuntimeError("Incomplete or failing checks. No checkpoint created.")
    validation = {"recorded_utc": datetime.now(timezone.utc).isoformat(), "test_counts": counts,
                  "build": result, "browser_verified_this_build": False}
    (root / "docs/checkpoint-validation-latest.json").write_text(json.dumps(validation, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    files = {}
    if browser:
        files["verification/browser-qa.json"] = json.dumps(browser, ensure_ascii=False, indent=2).encode()
    for name in [".gitignore", "AGENTS.md", "HANDOFF.md", "RESTART_HANDOFF_V09.md", "README.md", "index.html", "package.json"]:
        files["source/" + name] = (root / name).read_bytes()
    for folder in ["src", "assets", "docs", "tests", "scripts"]:
        for path in sorted((root / folder).rglob("*")):
            if path.is_symlink():
                raise RuntimeError("Refusing a symlink in source: " + str(path))
            if path.is_file() and "__pycache__" not in path.parts and path.suffix != ".pyc":
                files["source/" + path.relative_to(root).as_posix()] = path.read_bytes()
    for path in sorted(playable.iterdir()):
        if path.is_file() and not path.is_symlink():
            files["playable/" + path.name] = path.read_bytes()
    artifact = files["playable/" + result["filename"]]
    if len(artifact) != result["size"] or digest(artifact) != result["sha256"]:
        raise RuntimeError("Playable artifact changed during backup.")

    # Carry forward original art and early checkpoints only after verification.
    with zipfile.ZipFile(base) as archive:
        manifest = json.loads(archive.read("manifest.json"))
        for entry in manifest["files"]:
            name = entry["path"]
            if not name.startswith(("original_art/", "checkpoints/")):
                continue
            parts = PurePosixPath(name)
            if parts.is_absolute() or ".." in parts.parts:
                raise RuntimeError("Unsafe source archive path.")
            data = archive.read(name)
            if len(data) != entry["size"] or digest(data) != entry["sha256"]:
                raise RuntimeError("Previous archive hash mismatch: " + name)
            files[name] = data
    if len([name for name in files if name.startswith("original_art/") and not name.startswith("original_art/expansion_v09/") and name.endswith(".png")]) != 8:
        raise RuntimeError("Eight original art images are required for a complete backup.")

    if originals is None:
        raise RuntimeError("The current v0.9 original images must be supplied with --originals.")
    added = 0
    for path in sorted(originals.rglob("*")):
        if path.is_symlink():
            raise RuntimeError("Refusing a symlink in original art.")
        if path.is_file() and path.suffix.lower() in {".png", ".json", ".md", ".txt"}:
            name = "original_art/expansion_v09/" + path.relative_to(originals).as_posix()
            data = path.read_bytes()
            if name in files and path.suffix.lower() == ".png" and files[name] != data:
                raise RuntimeError("An original image would overwrite different prior bytes: " + name)
            files[name] = data
            added += path.suffix.lower() == ".png"
    if added < 7:
        raise RuntimeError("At least the seven initial expansion originals are required.")
    original_count = len([name for name in files if name.startswith("original_art/") and name.endswith(".png")])
    webps = [name for name in files if name.startswith("source/assets/art/") and name.endswith(".webp")]
    if len(webps) != original_count:
        raise RuntimeError("Each saved production WebP needs its own preserved original PNG.")
    full_art = json.loads((root / "assets/release-art-manifest.json").read_text(encoding="utf-8"))
    art_target = len(full_art["rasterAssets"])
    art_verified = sum(bool(a.get("reviewed")) and a.get("integration") in {"verified-existing", "verified"} and (root / a["path"]).is_file() for a in full_art["rasterAssets"])
    art_status = {"target": art_target, "saved": len(webps), "reviewed_and_integrated": art_verified, "full_scope_ready": art_verified == art_target == len(webps)}

    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    version = result["version"]
    tests = counts["tests"]
    passed = counts["pass"]
    skipped = counts["skipped"]
    files["verification/check.log"] = (check.stdout + check.stderr).encode()
    files["verification/build.log"] = (built.stdout + built.stderr).encode()
    browser_note = "附带与构建匹配的云端 HTTP 部分界面检查证据；未完成事项和阻碍见 verification/browser-qa.json，不代表完整界面验收通过。真机和 file:// 未验收。" if browser else "本包没有附带与此构建一致的浏览器验收报告，不能据此声称界面、真机或离线验证通过。"
    files["BACKUP_README.md"] = f"""# 外贸达人养成记 {version} 可恢复开发检查点

快照 UTC：{stamp}。

- source/：原策划、源码、{len(webps)}张 WebP、测试、开发交接与备份脚本。
- playable/：单文件试玩，{result["modules"]} 个模块与{len(webps)}张当前已保存插画内嵌，无外部网络依赖。
- original_art/：{original_count}张原始 PNG 和素材对应表，前八张逐项从前次备份校验保留，新素材独立保留。
- checkpoints/：较早源码检查点。
- verification/：本次自动检查与构建原始结果。
- manifest.json、verify_backup.py：每个内容文件的字节数和 SHA256 校验。

当前内容：八章经营故事与五组新增跨章节回响、八位成年角色关系线、24 段工作日常及16处实际选择承接、双休日自愿安排、交付结算卡、具名回忆和成长图鉴。存档 schema 6，支持旧档迁移，新场景保存真实选择快照。自动检查共{tests}项，{passed}项通过、{skipped}项平台限制显式跳过、0项失败；便携构建通过。具体已验与未验事项见 source/docs/WIP_V09.md。

{browser_note}

这是当前已实现内容的开发检查点，不是完整版完成声明。完整版栅格美术目标{art_target}张，已保存{len(webps)}张，已审图并接入验证{art_verified}张；其他部分仍在开发验收，尚未商业发布。

这是创建它的当前机器上的本地检查点，不代表已经同步到其他设备、GitHub 或 Dropbox。未执行第三方同步，也未重试被拒的 GitHub 操作。

请解压到独立目录，不覆盖旧版。已有 Node.js 可运行 node verify_backup.mjs 校验；也可用已有 Python 3.9+ 运行 python verify_backup.py。Node.js 20+ 可进入 source/ 执行 npm start，无需 npm install。进度在浏览器本地，换设备前需自行导出游戏存档。本包不含私人浏览器存档、凭据、其他项目或运行缓存。
""".encode()
    files["verify_backup.py"] = b'''from pathlib import Path
import hashlib,json,sys
root=Path(__file__).resolve().parent
manifest=json.loads((root/'manifest.json').read_text(encoding='utf-8'))
errors=[]
for item in manifest['files']:
    p=(root/item['path']).resolve()
    if not p.is_relative_to(root) or not p.is_file():
        errors.append(item['path']+': missing or unsafe');continue
    data=p.read_bytes()
    if len(data)!=item['size'] or hashlib.sha256(data).hexdigest()!=item['sha256']:
        errors.append(item['path']+': mismatch')
print('PASS '+str(len(manifest['files']))+' files' if not errors else '\\n'.join(errors))
sys.exit(bool(errors))
'''
    files["verify_backup.mjs"] = b'''import {readFile,realpath} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=await realpath(path.dirname(fileURLToPath(import.meta.url)));
const manifest=JSON.parse(await readFile(path.join(root,'manifest.json'),'utf8')),errors=[];
for(const item of manifest.files){try{
 const p=await realpath(path.resolve(root,item.path));
 if(!p.startsWith(root+path.sep))throw Error('unsafe path');
 const b=await readFile(p);
 if(b.length!==item.size||createHash('sha256').update(b).digest('hex')!==item.sha256)throw Error('mismatch');
}catch(e){errors.push(item.path+': '+e.message);}}
console.log(errors.length?errors.join('\\n'):'PASS '+manifest.files.length+' files');
process.exitCode=errors.length?1:0;
'''
    manifest = {"version": version, "snapshot_utc": stamp, "tests_passed": passed, "test_counts": counts,
                "browser_verified_this_checkpoint": bool(browser and browser.get("status") == "passed"), "browser_evidence_attached": browser is not None, "art_status": art_status,
                "files": [{"path": name, "size": len(data), "sha256": digest(data)}
                          for name, data in sorted(files.items())]}
    files["manifest.json"] = json.dumps(manifest, ensure_ascii=False, indent=2).encode()
    output.mkdir(parents=True, exist_ok=True)
    archive_path = output / f"trade-tycoon-cloud-backup-v{version.split('-')[0]}-{stamp}.zip"
    with zipfile.ZipFile(archive_path, "x", zipfile.ZIP_DEFLATED) as archive:
        for name, data in sorted(files.items()):
            archive.writestr(name, data)
    with zipfile.ZipFile(archive_path) as archive:
        if archive.testzip() is not None:
            raise RuntimeError("Archive integrity check failed.")
        for entry in manifest["files"]:
            data = archive.read(entry["path"])
            if len(data) != entry["size"] or digest(data) != entry["sha256"]:
                raise RuntimeError("Archive verification failed: " + entry["path"])
    receipt = {"path": str(archive_path), "size": archive_path.stat().st_size,
               "sha256": digest(archive_path.read_bytes()), "verified_files": len(manifest["files"]),
               "version": version, "tests_passed": passed, "test_counts": counts, "art_status": art_status, "external_sync": "not_attempted"}
    with archive_path.with_suffix(".receipt.json").open("x", encoding="utf-8") as file:
        json.dump(receipt, file, ensure_ascii=False, indent=2)
    print(json.dumps(receipt, ensure_ascii=False))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", type=Path, required=True, help="Previous complete, verified backup ZIP")
    parser.add_argument("--output", type=Path, required=True, help="Local output directory for a new versioned ZIP")
    parser.add_argument("--browser-report", type=Path, help="Optional QA report whose version and artifact SHA256 must match")
    parser.add_argument("--originals", type=Path, required=True, help="Directory with all currently integrated v0.9 original PNG images")
    args = parser.parse_args()
    build(args.base.resolve(), args.output.resolve(), args.browser_report.resolve() if args.browser_report else None, args.originals.resolve())
