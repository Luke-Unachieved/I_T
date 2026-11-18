import test from 'node:test';import assert from 'node:assert/strict';
import {businessFeedback} from '../src/deal-room-curation-view.js';
test('life purchase copy changes only at presentation, preserving the canonical recorded message',()=>{
 const state={feedback:{kind:'personal-life',message:'靠窗的阅读椅送到了家里。花了 ¥800，这是个人消费，不会提高订单收益。'}};
 const before=JSON.stringify(state);assert.match(businessFeedback(state),/把忙碌换成一点自己的日常/);assert.equal(JSON.stringify(state),before);
});
