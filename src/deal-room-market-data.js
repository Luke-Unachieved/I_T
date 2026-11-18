// Fictional game quotations in whole RMB, not real purchase offers or certification.
const products = [
  {
    "id": "tray",
    "name": "可叠放餐盘托盘",
    "category": "餐桌器具",
    "buyer": "岚岸餐饮采购社",
    "brief": "自助餐台换盘需要单手抽出一只，潮湿台面也要拿得稳。",
    "inspection": "湿手握持，满载抽叠后不咬边。",
    "unit": "只",
    "sources": {
      "stock": {
        "name": "陶木现货联仓",
        "minQuantity": 36,
        "unitCost": 24,
        "days": 3,
        "packSize": 9,
        "freightBase": 45,
        "freightPerBox": 4
      },
      "factory": {
        "name": "餐具排产合作社",
        "minQuantity": 120,
        "unitCost": 19,
        "days": 8,
        "packSize": 20,
        "freightBase": 89,
        "freightPerBox": 2
      }
    },
    "offers": {
      "trial": {
        "quantity": 36,
        "maxUnitPrice": 37,
        "deadlineDays": 4,
        "payLag": 0,
        "depositPercent": 0
      },
      "bulk": {
        "quantity": 120,
        "maxUnitPrice": 32,
        "deadlineDays": 10,
        "payLag": 5,
        "depositPercent": 30
      }
    }
  },
  {
    "id": "carafe",
    "name": "耐热玻璃冷水壶",
    "category": "餐桌器具",
    "buyer": "岚岸餐饮采购社",
    "brief": "早餐台补冷水后直接上桌，壶嘴不能顺壁淌水。",
    "inspection": "冷热样轮换后注水；隔挡箱里把手不相碰。",
    "unit": "把",
    "sources": {
      "stock": {
        "name": "陶木现货联仓",
        "minQuantity": 24,
        "unitCost": 36,
        "days": 4,
        "packSize": 6,
        "freightBase": 75,
        "freightPerBox": 10
      },
      "factory": {
        "name": "餐具排产合作社",
        "minQuantity": 72,
        "unitCost": 29,
        "days": 9,
        "packSize": 12,
        "freightBase": 125,
        "freightPerBox": 5
      }
    },
    "offers": {
      "trial": {
        "quantity": 24,
        "maxUnitPrice": 58,
        "deadlineDays": 5,
        "payLag": 0,
        "depositPercent": 0
      },
      "bulk": {
        "quantity": 72,
        "maxUnitPrice": 51,
        "deadlineDays": 11,
        "payLag": 5,
        "depositPercent": 30
      }
    }
  },
  {
    "id": "salad-bowl",
    "name": "沙拉碗",
    "category": "餐桌器具",
    "buyer": "岚岸餐饮采购社",
    "brief": "自助餐岛按份补菜，需要一摞碗不晃、不留积水。",
    "inspection": "同批六只叠放平稳，碗底排水。",
    "unit": "只",
    "sources": {
      "stock": {
        "name": "陶木现货联仓",
        "minQuantity": 48,
        "unitCost": 19,
        "days": 3,
        "packSize": 12,
        "freightBase": 55,
        "freightPerBox": 6
      },
      "factory": {
        "name": "餐具排产合作社",
        "minQuantity": 144,
        "unitCost": 15,
        "days": 7,
        "packSize": 24,
        "freightBase": 101,
        "freightPerBox": 3
      }
    },
    "offers": {
      "trial": {
        "quantity": 48,
        "maxUnitPrice": 32,
        "deadlineDays": 4,
        "payLag": 0,
        "depositPercent": 0
      },
      "bulk": {
        "quantity": 144,
        "maxUnitPrice": 28,
        "deadlineDays": 9,
        "payLag": 5,
        "depositPercent": 30
      }
    }
  },
  {
    "id": "serving-tongs",
    "name": "不锈钢餐夹",
    "category": "餐桌器具",
    "buyer": "岚岸餐饮采购社",
    "brief": "熟食柜一只手夹取切片，员工闭店后统一挂起。",
    "inspection": "反复夹取薄片；锁扣闭合后不弹开。",
    "unit": "把",
    "sources": {
      "stock": {
        "name": "陶木现货联仓",
        "minQuantity": 60,
        "unitCost": 13,
        "days": 2,
        "packSize": 15,
        "freightBase": 35,
        "freightPerBox": 2
      },
      "factory": {
        "name": "餐具排产合作社",
        "minQuantity": 180,
        "unitCost": 10,
        "days": 6,
        "packSize": 30,
        "freightBase": 77,
        "freightPerBox": 1
      }
    },
    "offers": {
      "trial": {
        "quantity": 60,
        "maxUnitPrice": 23,
        "deadlineDays": 3,
        "payLag": 0,
        "depositPercent": 0
      },
      "bulk": {
        "quantity": 180,
        "maxUnitPrice": 20,
        "deadlineDays": 8,
        "payLag": 5,
        "depositPercent": 30
      }
    }
  },
  {
    "id": "pepper-mill",
    "name": "手摇胡椒研磨器",
    "category": "餐桌器具",
    "buyer": "岚岸餐饮采购社",
    "brief": "开放式餐桌让客人自行调节胡椒粗细。",
    "inspection": "粗细两档出粒可辨，倒放不漏整粒。",
    "unit": "只",
    "sources": {
      "stock": {
        "name": "陶木现货联仓",
        "minQuantity": 30,
        "unitCost": 30,
        "days": 3,
        "packSize": 8,
        "freightBase": 45,
        "freightPerBox": 4
      },
      "factory": {
        "name": "餐具排产合作社",
        "minQuantity": 90,
        "unitCost": 24,
        "days": 8,
        "packSize": 15,
        "freightBase": 89,
        "freightPerBox": 2
      }
    },
    "offers": {
      "trial": {
        "quantity": 30,
        "maxUnitPrice": 49,
        "deadlineDays": 4,
        "payLag": 0,
        "depositPercent": 0
      },
      "bulk": {
        "quantity": 90,
        "maxUnitPrice": 43,
        "deadlineDays": 10,
        "payLag": 5,
        "depositPercent": 30
      }
    }
  },
  {
    "id": "dripper",
    "name": "陶瓷手冲滤杯",
    "category": "咖啡与餐厨",
    "buyer": "栎街咖啡供应社",
    "brief": "手冲教学台用同一只滤杯演示两次稳定冲煮。",
    "inspection": "滤纸贴合，底孔通畅；发货做独格防碰。",
    "unit": "只",
    "sources": {
      "stock": {
        "name": "餐厨配件联仓",
        "minQuantity": 24,
        "unitCost": 23,
        "days": 4,
        "packSize": 6,
        "freightBase": 65,
        "freightPerBox": 8
      },
      "factory": {
        "name": "餐厨器具合作厂",
        "minQuantity": 96,
        "unitCost": 18,
        "days": 9,
        "packSize": 16,
        "freightBase": 113,
        "freightPerBox": 4
      }
    },
    "offers": {
      "trial": {
        "quantity": 24,
        "maxUnitPrice": 39,
        "deadlineDays": 5,
        "payLag": 0,
        "depositPercent": 0
      },
      "bulk": {
        "quantity": 96,
        "maxUnitPrice": 34,
        "deadlineDays": 11,
        "payLag": 5,
        "depositPercent": 30
      }
    }
  },
  {
    "id": "pitcher",
    "name": "不锈钢拉花缸",
    "category": "咖啡与餐厨",
    "buyer": "栎街咖啡供应社",
    "brief": "新店训练奶泡拉花，尖嘴决定能否细流收尾。",
    "inspection": "定量倒水，嘴口连续收束且无毛刺。",
    "unit": "只",
    "sources": {
      "stock": {
        "name": "餐厨配件联仓",
        "minQuantity": 36,
        "unitCost": 20,
        "days": 3,
        "packSize": 9,
        "freightBase": 45,
        "freightPerBox": 4
      },
      "factory": {
        "name": "餐厨器具合作厂",
        "minQuantity": 108,
        "unitCost": 16,
        "days": 8,
        "packSize": 18,
        "freightBase": 89,
        "freightPerBox": 2
      }
    },
    "offers": {
      "trial": {
        "quantity": 36,
        "maxUnitPrice": 34,
        "deadlineDays": 4,
        "payLag": 0,
        "depositPercent": 0
      },
      "bulk": {
        "quantity": 108,
        "maxUnitPrice": 29,
        "deadlineDays": 10,
        "payLag": 5,
        "depositPercent": 30
      }
    }
  },
  {
    "id": "knock-box",
    "name": "咖啡粉渣盒",
    "category": "咖啡与餐厨",
    "buyer": "栎街咖啡供应社",
    "brief": "小吧台要接住整块粉饼，敲击时底座不能滑走。",
    "inspection": "满载敲击横杆不移位，盒体可取下清洗。",
    "unit": "只",
    "sources": {
      "stock": {
        "name": "餐厨配件联仓",
        "minQuantity": 18,
        "unitCost": 39,
        "days": 4,
        "packSize": 5,
        "freightBase": 65,
        "freightPerBox": 8
      },
      "factory": {
        "name": "餐厨器具合作厂",
        "minQuantity": 60,
        "unitCost": 31,
        "days": 10,
        "packSize": 10,
        "freightBase": 113,
        "freightPerBox": 4
      }
    },
    "offers": {
      "trial": {
        "quantity": 18,
        "maxUnitPrice": 64,
        "deadlineDays": 5,
        "payLag": 0,
        "depositPercent": 0
      },
      "bulk": {
        "quantity": 60,
        "maxUnitPrice": 56,
        "deadlineDays": 12,
        "payLag": 5,
        "depositPercent": 30
      }
    }
  },
  {
    "id": "scale",
    "name": "电子厨房秤",
    "category": "咖啡与餐厨",
    "buyer": "栎街咖啡供应社",
    "brief": "烘焙间分装原料，称轻料与去皮都需稳定。",
    "inspection": "核样砝码复测归零与去皮；无电池出货。",
    "unit": "台",
    "sources": {
      "stock": {
        "name": "餐厨配件联仓",
        "minQuantity": 30,
        "unitCost": 35,
        "days": 3,
        "packSize": 8,
        "freightBase": 45,
        "freightPerBox": 4
      },
      "factory": {
        "name": "餐厨器具合作厂",
        "minQuantity": 90,
        "unitCost": 28,
        "days": 8,
        "packSize": 15,
        "freightBase": 89,
        "freightPerBox": 2
      }
    },
    "offers": {
      "trial": {
        "quantity": 30,
        "maxUnitPrice": 57,
        "deadlineDays": 4,
        "payLag": 0,
        "depositPercent": 0
      },
      "bulk": {
        "quantity": 90,
        "maxUnitPrice": 50,
        "deadlineDays": 10,
        "payLag": 5,
        "depositPercent": 30
      }
    }
  },
  {
    "id": "chopping-board",
    "name": "双面砧板",
    "category": "咖啡与餐厨",
    "buyer": "栎街咖啡供应社",
    "brief": "后厨分区切配，板边能立起晾干。",
    "inspection": "板面平整，切菜侧防滑脚全部着地。",
    "unit": "块",
    "sources": {
      "stock": {
        "name": "餐厨配件联仓",
        "minQuantity": 24,
        "unitCost": 28,
        "days": 4,
        "packSize": 6,
        "freightBase": 65,
        "freightPerBox": 8
      },
      "factory": {
        "name": "餐厨器具合作厂",
        "minQuantity": 84,
        "unitCost": 22,
        "days": 9,
        "packSize": 14,
        "freightBase": 113,
        "freightPerBox": 4
      }
    },
    "offers": {
      "trial": {
        "quantity": 24,
        "maxUnitPrice": 47,
        "deadlineDays": 5,
        "payLag": 0,
        "depositPercent": 0
      },
      "bulk": {
        "quantity": 84,
        "maxUnitPrice": 41,
        "deadlineDays": 11,
        "payLag": 5,
        "depositPercent": 30
      }
    }
  },
  {
    "id": "napkin",
    "name": "可机洗棉餐巾",
    "category": "家居布艺",
    "buyer": "白榆旅宿布品部",
    "brief": "旅馆早餐厅每天换洗，折好后要能竖在餐盘上。",
    "inspection": "样布按约定洗护后核对缩率与四角。",
    "unit": "条",
    "sources": {
      "stock": {
        "name": "布品成品仓",
        "minQuantity": 96,
        "unitCost": 8,
        "days": 2,
        "packSize": 24,
        "freightBase": 35,
        "freightPerBox": 2
      },
      "factory": {
        "name": "织造与缝制工坊",
        "minQuantity": 360,
        "unitCost": 6,
        "days": 6,
        "packSize": 60,
        "freightBase": 77,
        "freightPerBox": 1
      }
    },
    "offers": {
      "trial": {
        "quantity": 96,
        "maxUnitPrice": 15,
        "deadlineDays": 3,
        "payLag": 0,
        "depositPercent": 0
      },
      "bulk": {
        "quantity": 360,
        "maxUnitPrice": 13,
        "deadlineDays": 8,
        "payLag": 5,
        "depositPercent": 30
      }
    }
  },
  {
    "id": "apron",
    "name": "厨房围裙",
    "category": "家居布艺",
    "buyer": "白榆旅宿布品部",
    "brief": "开放厨房员工需一人快速系好，前袋放得下点单本。",
    "inspection": "加固袋口受力，系带长度符合样衣。",
    "unit": "条",
    "sources": {
      "stock": {
        "name": "布品成品仓",
        "minQuantity": 36,
        "unitCost": 24,
        "days": 3,
        "packSize": 9,
        "freightBase": 35,
        "freightPerBox": 2
      },
      "factory": {
        "name": "织造与缝制工坊",
        "minQuantity": 120,
        "unitCost": 19,
        "days": 8,
        "packSize": 20,
        "freightBase": 77,
        "freightPerBox": 1
      }
    },
    "offers": {
      "trial": {
        "quantity": 36,
        "maxUnitPrice": 41,
        "deadlineDays": 4,
        "payLag": 0,
        "depositPercent": 0
      },
      "bulk": {
        "quantity": 120,
        "maxUnitPrice": 36,
        "deadlineDays": 10,
        "payLag": 5,
        "depositPercent": 30
      }
    }
  },
  {
    "id": "oven-mitt",
    "name": "隔热烤箱手套",
    "category": "家居布艺",
    "buyer": "白榆旅宿布品部",
    "brief": "烘焙台转移热烤盘，手腕需受到足长覆盖。",
    "inspection": "依订单样品验证衬层和握持，不以外观代验。",
    "unit": "只",
    "sources": {
      "stock": {
        "name": "布品成品仓",
        "minQuantity": 48,
        "unitCost": 15,
        "days": 3,
        "packSize": 12,
        "freightBase": 45,
        "freightPerBox": 4
      },
      "factory": {
        "name": "织造与缝制工坊",
        "minQuantity": 144,
        "unitCost": 12,
        "days": 8,
        "packSize": 24,
        "freightBase": 89,
        "freightPerBox": 2
      }
    },
    "offers": {
      "trial": {
        "quantity": 48,
        "maxUnitPrice": 28,
        "deadlineDays": 4,
        "payLag": 0,
        "depositPercent": 0
      },
      "bulk": {
        "quantity": 144,
        "maxUnitPrice": 24,
        "deadlineDays": 10,
        "payLag": 5,
        "depositPercent": 30
      }
    }
  },
  {
    "id": "bath-mat",
    "name": "浴室地垫",
    "category": "家居布艺",
    "buyer": "白榆旅宿布品部",
    "brief": "旅宿淋浴出口换垫，地面潮湿时也要平整铺开。",
    "inspection": "检查防滑底与边缘收口，洗后实测平整。",
    "unit": "块",
    "sources": {
      "stock": {
        "name": "布品成品仓",
        "minQuantity": 24,
        "unitCost": 29,
        "days": 4,
        "packSize": 6,
        "freightBase": 55,
        "freightPerBox": 6
      },
      "factory": {
        "name": "织造与缝制工坊",
        "minQuantity": 90,
        "unitCost": 23,
        "days": 9,
        "packSize": 15,
        "freightBase": 101,
        "freightPerBox": 3
      }
    },
    "offers": {
      "trial": {
        "quantity": 24,
        "maxUnitPrice": 49,
        "deadlineDays": 5,
        "payLag": 0,
        "depositPercent": 0
      },
      "bulk": {
        "quantity": 90,
        "maxUnitPrice": 43,
        "deadlineDays": 11,
        "payLag": 5,
        "depositPercent": 30
      }
    }
  },
  {
    "id": "pillowcase",
    "name": "枕套",
    "category": "家居布艺",
    "buyer": "白榆旅宿布品部",
    "brief": "换房班组快速更换内芯，开口要包住枕头端面。",
    "inspection": "按买方枕芯试套，搭口洗后仍能覆盖。",
    "unit": "只",
    "sources": {
      "stock": {
        "name": "布品成品仓",
        "minQuantity": 48,
        "unitCost": 17,
        "days": 3,
        "packSize": 12,
        "freightBase": 45,
        "freightPerBox": 4
      },
      "factory": {
        "name": "织造与缝制工坊",
        "minQuantity": 168,
        "unitCost": 13,
        "days": 7,
        "packSize": 28,
        "freightBase": 89,
        "freightPerBox": 2
      }
    },
    "offers": {
      "trial": {
        "quantity": 48,
        "maxUnitPrice": 29,
        "deadlineDays": 4,
        "payLag": 0,
        "depositPercent": 0
      },
      "bulk": {
        "quantity": 168,
        "maxUnitPrice": 25,
        "deadlineDays": 9,
        "payLag": 5,
        "depositPercent": 30
      }
    }
  },
  {
    "id": "bookend",
    "name": "书立",
    "category": "桌面办公",
    "buyer": "折线办公选品社",
    "brief": "共享办公室书架分隔资料，两侧不可压伤桌面。",
    "inspection": "装满样书后直立，底部脚垫不脱落。",
    "unit": "对",
    "sources": {
      "stock": {
        "name": "办公器具联仓",
        "minQuantity": 30,
        "unitCost": 23,
        "days": 3,
        "packSize": 8,
        "freightBase": 55,
        "freightPerBox": 6
      },
      "factory": {
        "name": "桌面用品制造社",
        "minQuantity": 96,
        "unitCost": 18,
        "days": 8,
        "packSize": 16,
        "freightBase": 101,
        "freightPerBox": 3
      }
    },
    "offers": {
      "trial": {
        "quantity": 30,
        "maxUnitPrice": 40,
        "deadlineDays": 4,
        "payLag": 0,
        "depositPercent": 0
      },
      "bulk": {
        "quantity": 96,
        "maxUnitPrice": 35,
        "deadlineDays": 10,
        "payLag": 5,
        "depositPercent": 30
      }
    }
  },
  {
    "id": "laptop-stand",
    "name": "折叠笔记本支架",
    "category": "桌面办公",
    "buyer": "折线办公选品社",
    "brief": "培训室快速收台，支架折起可纳入资料柜。",
    "inspection": "展开锁止承载样机，折叠不夹住脚垫。",
    "unit": "个",
    "sources": {
      "stock": {
        "name": "办公器具联仓",
        "minQuantity": 18,
        "unitCost": 46,
        "days": 4,
        "packSize": 5,
        "freightBase": 55,
        "freightPerBox": 6
      },
      "factory": {
        "name": "桌面用品制造社",
        "minQuantity": 60,
        "unitCost": 37,
        "days": 10,
        "packSize": 10,
        "freightBase": 101,
        "freightPerBox": 3
      }
    },
    "offers": {
      "trial": {
        "quantity": 18,
        "maxUnitPrice": 78,
        "deadlineDays": 5,
        "payLag": 0,
        "depositPercent": 0
      },
      "bulk": {
        "quantity": 60,
        "maxUnitPrice": 68,
        "deadlineDays": 12,
        "payLag": 5,
        "depositPercent": 30
      }
    }
  },
  {
    "id": "display-board",
    "name": "桌面展示板",
    "category": "桌面办公",
    "buyer": "折线办公选品社",
    "brief": "会展客户需反复更换桌签，陈列面不得遮住标题。",
    "inspection": "插拔纸页不撕边，满幅展示在桌面立稳。",
    "unit": "块",
    "sources": {
      "stock": {
        "name": "办公器具联仓",
        "minQuantity": 48,
        "unitCost": 14,
        "days": 2,
        "packSize": 12,
        "freightBase": 45,
        "freightPerBox": 4
      },
      "factory": {
        "name": "桌面用品制造社",
        "minQuantity": 156,
        "unitCost": 11,
        "days": 7,
        "packSize": 26,
        "freightBase": 89,
        "freightPerBox": 2
      }
    },
    "offers": {
      "trial": {
        "quantity": 48,
        "maxUnitPrice": 26,
        "deadlineDays": 3,
        "payLag": 0,
        "depositPercent": 0
      },
      "bulk": {
        "quantity": 156,
        "maxUnitPrice": 22,
        "deadlineDays": 9,
        "payLag": 5,
        "depositPercent": 30
      }
    }
  },
  {
    "id": "file-box",
    "name": "文件收纳盒",
    "category": "桌面办公",
    "buyer": "折线办公选品社",
    "brief": "联合办公按项目归档，标准文件夹可整夹放入。",
    "inspection": "核对样夹宽度、满载提孔与叠放承压。",
    "unit": "只",
    "sources": {
      "stock": {
        "name": "办公器具联仓",
        "minQuantity": 36,
        "unitCost": 18,
        "days": 3,
        "packSize": 9,
        "freightBase": 65,
        "freightPerBox": 8
      },
      "factory": {
        "name": "桌面用品制造社",
        "minQuantity": 120,
        "unitCost": 14,
        "days": 8,
        "packSize": 20,
        "freightBase": 113,
        "freightPerBox": 4
      }
    },
    "offers": {
      "trial": {
        "quantity": 36,
        "maxUnitPrice": 31,
        "deadlineDays": 4,
        "payLag": 0,
        "depositPercent": 0
      },
      "bulk": {
        "quantity": 120,
        "maxUnitPrice": 27,
        "deadlineDays": 10,
        "payLag": 5,
        "depositPercent": 30
      }
    }
  },
  {
    "id": "stapler",
    "name": "桌面订书机",
    "category": "桌面办公",
    "buyer": "折线办公选品社",
    "brief": "前台整理多页签收单，单手操作后要自动回位。",
    "inspection": "用约定页数的样纸试订，回弹不卡针。",
    "unit": "台",
    "sources": {
      "stock": {
        "name": "办公器具联仓",
        "minQuantity": 48,
        "unitCost": 15,
        "days": 3,
        "packSize": 12,
        "freightBase": 45,
        "freightPerBox": 4
      },
      "factory": {
        "name": "桌面用品制造社",
        "minQuantity": 144,
        "unitCost": 12,
        "days": 7,
        "packSize": 24,
        "freightBase": 89,
        "freightPerBox": 2
      }
    },
    "offers": {
      "trial": {
        "quantity": 48,
        "maxUnitPrice": 27,
        "deadlineDays": 4,
        "payLag": 0,
        "depositPercent": 0
      },
      "bulk": {
        "quantity": 144,
        "maxUnitPrice": 23,
        "deadlineDays": 9,
        "payLag": 5,
        "depositPercent": 30
      }
    }
  },
  {
    "id": "luggage-tag",
    "name": "行李挂牌",
    "category": "差旅用品",
    "buyer": "北岸旅行用品社",
    "brief": "旅行团用挂牌认领行李，公开面不能直接露出电话。",
    "inspection": "翻盖遮住信息，绑带拉紧后不自行退出。",
    "unit": "枚",
    "sources": {
      "stock": {
        "name": "差旅配件仓",
        "minQuantity": 120,
        "unitCost": 7,
        "days": 2,
        "packSize": 30,
        "freightBase": 35,
        "freightPerBox": 2
      },
      "factory": {
        "name": "差旅用品制造社",
        "minQuantity": 400,
        "unitCost": 5,
        "days": 6,
        "packSize": 67,
        "freightBase": 77,
        "freightPerBox": 1
      }
    },
    "offers": {
      "trial": {
        "quantity": 120,
        "maxUnitPrice": 13,
        "deadlineDays": 3,
        "payLag": 0,
        "depositPercent": 0
      },
      "bulk": {
        "quantity": 400,
        "maxUnitPrice": 11,
        "deadlineDays": 8,
        "payLag": 5,
        "depositPercent": 30
      }
    }
  },
  {
    "id": "passport-cover",
    "name": "护照夹",
    "category": "差旅用品",
    "buyer": "北岸旅行用品社",
    "brief": "商务旅行套装需要护照夹同时收纳一张登机牌。",
    "inspection": "用空白尺寸样本试插，内袋边缘不刮纸。",
    "unit": "只",
    "sources": {
      "stock": {
        "name": "差旅配件仓",
        "minQuantity": 60,
        "unitCost": 14,
        "days": 3,
        "packSize": 15,
        "freightBase": 35,
        "freightPerBox": 2
      },
      "factory": {
        "name": "差旅用品制造社",
        "minQuantity": 180,
        "unitCost": 11,
        "days": 7,
        "packSize": 30,
        "freightBase": 77,
        "freightPerBox": 1
      }
    },
    "offers": {
      "trial": {
        "quantity": 60,
        "maxUnitPrice": 27,
        "deadlineDays": 4,
        "payLag": 0,
        "depositPercent": 0
      },
      "bulk": {
        "quantity": 180,
        "maxUnitPrice": 23,
        "deadlineDays": 9,
        "payLag": 5,
        "depositPercent": 30
      }
    }
  },
  {
    "id": "neck-pillow",
    "name": "旅行颈枕",
    "category": "差旅用品",
    "buyer": "北岸旅行用品社",
    "brief": "长途车站商店需要可压缩、上架能回弹的颈枕。",
    "inspection": "从运输袋取出后检查回弹与颈部内侧接缝。",
    "unit": "个",
    "sources": {
      "stock": {
        "name": "差旅配件仓",
        "minQuantity": 30,
        "unitCost": 27,
        "days": 4,
        "packSize": 8,
        "freightBase": 65,
        "freightPerBox": 8
      },
      "factory": {
        "name": "差旅用品制造社",
        "minQuantity": 96,
        "unitCost": 21,
        "days": 9,
        "packSize": 16,
        "freightBase": 113,
        "freightPerBox": 4
      }
    },
    "offers": {
      "trial": {
        "quantity": 30,
        "maxUnitPrice": 47,
        "deadlineDays": 5,
        "payLag": 0,
        "depositPercent": 0
      },
      "bulk": {
        "quantity": 96,
        "maxUnitPrice": 41,
        "deadlineDays": 11,
        "payLag": 5,
        "depositPercent": 30
      }
    }
  },
  {
    "id": "umbrella",
    "name": "折叠雨伞",
    "category": "差旅用品",
    "buyer": "北岸旅行用品社",
    "brief": "雨季访客到达时可随手带走，收进小包也不滴一路。",
    "inspection": "反复开合与拉杆锁止，湿伞套按样配套。",
    "unit": "把",
    "sources": {
      "stock": {
        "name": "差旅配件仓",
        "minQuantity": 36,
        "unitCost": 33,
        "days": 3,
        "packSize": 9,
        "freightBase": 55,
        "freightPerBox": 6
      },
      "factory": {
        "name": "差旅用品制造社",
        "minQuantity": 120,
        "unitCost": 26,
        "days": 8,
        "packSize": 20,
        "freightBase": 101,
        "freightPerBox": 3
      }
    },
    "offers": {
      "trial": {
        "quantity": 36,
        "maxUnitPrice": 55,
        "deadlineDays": 4,
        "payLag": 0,
        "depositPercent": 0
      },
      "bulk": {
        "quantity": 120,
        "maxUnitPrice": 48,
        "deadlineDays": 10,
        "payLag": 5,
        "depositPercent": 30
      }
    }
  },
  {
    "id": "packing-cube",
    "name": "行李分装袋",
    "category": "差旅用品",
    "buyer": "北岸旅行用品社",
    "brief": "商旅门店做旅行收纳演示，需要可看见袋内衣物。",
    "inspection": "网面透视，满装时拉链可顺畅绕过拐角。",
    "unit": "只",
    "sources": {
      "stock": {
        "name": "差旅配件仓",
        "minQuantity": 72,
        "unitCost": 13,
        "days": 2,
        "packSize": 18,
        "freightBase": 35,
        "freightPerBox": 2
      },
      "factory": {
        "name": "差旅用品制造社",
        "minQuantity": 216,
        "unitCost": 10,
        "days": 7,
        "packSize": 36,
        "freightBase": 77,
        "freightPerBox": 1
      }
    },
    "offers": {
      "trial": {
        "quantity": 72,
        "maxUnitPrice": 25,
        "deadlineDays": 3,
        "payLag": 0,
        "depositPercent": 0
      },
      "bulk": {
        "quantity": 216,
        "maxUnitPrice": 22,
        "deadlineDays": 9,
        "payLag": 5,
        "depositPercent": 30
      }
    }
  },
  {
    "id": "vase",
    "name": "窄口花瓶",
    "category": "家居陈列",
    "buyer": "庭序生活馆",
    "brief": "生活馆窗台做单枝展示，装水后不头重脚轻。",
    "inspection": "装水静置不渗，细颈单只防护包装。",
    "unit": "只",
    "sources": {
      "stock": {
        "name": "家居器物现货仓",
        "minQuantity": 24,
        "unitCost": 29,
        "days": 4,
        "packSize": 6,
        "freightBase": 75,
        "freightPerBox": 10
      },
      "factory": {
        "name": "生活器物工坊",
        "minQuantity": 72,
        "unitCost": 23,
        "days": 10,
        "packSize": 12,
        "freightBase": 125,
        "freightPerBox": 5
      }
    },
    "offers": {
      "trial": {
        "quantity": 24,
        "maxUnitPrice": 51,
        "deadlineDays": 5,
        "payLag": 0,
        "depositPercent": 0
      },
      "bulk": {
        "quantity": 72,
        "maxUnitPrice": 44,
        "deadlineDays": 12,
        "payLag": 5,
        "depositPercent": 30
      }
    }
  },
  {
    "id": "planter",
    "name": "带接水碟花盆",
    "category": "家居陈列",
    "buyer": "庭序生活馆",
    "brief": "陈列架摆真植物，浇水不能滴到下一层货。",
    "inspection": "排水孔与接水碟配合，叠装时分隔盆沿。",
    "unit": "只",
    "sources": {
      "stock": {
        "name": "家居器物现货仓",
        "minQuantity": 36,
        "unitCost": 20,
        "days": 3,
        "packSize": 9,
        "freightBase": 65,
        "freightPerBox": 8
      },
      "factory": {
        "name": "生活器物工坊",
        "minQuantity": 108,
        "unitCost": 16,
        "days": 9,
        "packSize": 18,
        "freightBase": 113,
        "freightPerBox": 4
      }
    },
    "offers": {
      "trial": {
        "quantity": 36,
        "maxUnitPrice": 37,
        "deadlineDays": 4,
        "payLag": 0,
        "depositPercent": 0
      },
      "bulk": {
        "quantity": 108,
        "maxUnitPrice": 32,
        "deadlineDays": 11,
        "payLag": 5,
        "depositPercent": 30
      }
    }
  },
  {
    "id": "coat-hook",
    "name": "壁挂衣帽钩",
    "category": "家居陈列",
    "buyer": "庭序生活馆",
    "brief": "玄关展示墙留挂包位，固定后不应划伤带子。",
    "inspection": "配件逐套点齐，试挂后边缘不刮织带。",
    "unit": "个",
    "sources": {
      "stock": {
        "name": "家居器物现货仓",
        "minQuantity": 60,
        "unitCost": 12,
        "days": 2,
        "packSize": 15,
        "freightBase": 35,
        "freightPerBox": 2
      },
      "factory": {
        "name": "生活器物工坊",
        "minQuantity": 200,
        "unitCost": 9,
        "days": 6,
        "packSize": 34,
        "freightBase": 77,
        "freightPerBox": 1
      }
    },
    "offers": {
      "trial": {
        "quantity": 60,
        "maxUnitPrice": 22,
        "deadlineDays": 3,
        "payLag": 0,
        "depositPercent": 0
      },
      "bulk": {
        "quantity": 200,
        "maxUnitPrice": 19,
        "deadlineDays": 8,
        "payLag": 5,
        "depositPercent": 30
      }
    }
  },
  {
    "id": "clock",
    "name": "壁钟",
    "category": "家居陈列",
    "buyer": "庭序生活馆",
    "brief": "样板房留安静阅读角，远处要能看清指针。",
    "inspection": "样机走时与指针间距检查，运输时保护针轴。",
    "unit": "只",
    "sources": {
      "stock": {
        "name": "家居器物现货仓",
        "minQuantity": 24,
        "unitCost": 36,
        "days": 4,
        "packSize": 6,
        "freightBase": 55,
        "freightPerBox": 6
      },
      "factory": {
        "name": "生活器物工坊",
        "minQuantity": 84,
        "unitCost": 29,
        "days": 9,
        "packSize": 14,
        "freightBase": 101,
        "freightPerBox": 3
      }
    },
    "offers": {
      "trial": {
        "quantity": 24,
        "maxUnitPrice": 64,
        "deadlineDays": 5,
        "payLag": 0,
        "depositPercent": 0
      },
      "bulk": {
        "quantity": 84,
        "maxUnitPrice": 56,
        "deadlineDays": 11,
        "payLag": 5,
        "depositPercent": 30
      }
    }
  },
  {
    "id": "basket",
    "name": "编织收纳篮",
    "category": "家居陈列",
    "buyer": "庭序生活馆",
    "brief": "生活馆把毛毯装进篮内，顾客要能提起整篮。",
    "inspection": "提手承载，编边不勾面料；套叠运输。",
    "unit": "只",
    "sources": {
      "stock": {
        "name": "家居器物现货仓",
        "minQuantity": 30,
        "unitCost": 25,
        "days": 4,
        "packSize": 8,
        "freightBase": 65,
        "freightPerBox": 8
      },
      "factory": {
        "name": "生活器物工坊",
        "minQuantity": 96,
        "unitCost": 20,
        "days": 9,
        "packSize": 16,
        "freightBase": 113,
        "freightPerBox": 4
      }
    },
    "offers": {
      "trial": {
        "quantity": 30,
        "maxUnitPrice": 46,
        "deadlineDays": 5,
        "payLag": 0,
        "depositPercent": 0
      },
      "bulk": {
        "quantity": 96,
        "maxUnitPrice": 40,
        "deadlineDays": 11,
        "payLag": 5,
        "depositPercent": 30
      }
    }
  }
];
function freezeMarketData(value){if(value && typeof value === 'object'){Object.values(value).forEach(freezeMarketData);Object.freeze(value);}return value;}
export const MARKET_PRODUCTS=freezeMarketData(products);
