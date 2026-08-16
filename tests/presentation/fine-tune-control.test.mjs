import assert from "node:assert/strict";
import test from "node:test";

import { createFineTuneControl } from "../../src/presentation/fine-tune-control.js";

test("Fine Tune amount selection renders and clamps keyboard stepping", () => {
  const buttons = [0.05, 0.1, 0.25, 0.5, 1].map(amount => ({
    dataset: { nudgeAmount: String(amount) },
    pressed: "",
    setAttribute(name, value) {
      if (name === "aria-pressed") this.pressed = value;
    }
  }));
  const control = createFineTuneControl({
    container: { querySelectorAll: () => buttons }
  });

  assert.equal(control.getAmount(), 0.1);
  assert.equal(control.setAmount("0.5"), true);
  assert.equal(control.getAmount(), 0.5);
  assert.deepEqual(buttons.map(button => button.pressed), ["false", "false", "false", "true", "false"]);
  assert.equal(control.setAmount(0.3), false);

  control.setAmount(0.1);
  control.stepAmount(-1);
  assert.equal(control.getAmount(), 0.05);
  assert.equal(control.stepAmount(-1), false);
  for (const expected of [0.1, 0.25, 0.5, 1]) {
    assert.equal(control.stepAmount(1), true);
    assert.equal(control.getAmount(), expected);
  }
  assert.equal(control.stepAmount(1), false);
  assert.equal(control.stepAmount(0), false);
});

test("invalid initial values fall back and missing current options are safe", () => {
  const amounts = [0.25, 0.5];
  const buttons = amounts.map(amount => ({
    dataset: { nudgeAmount: String(amount) },
    pressed: "",
    setAttribute(_name, value) { this.pressed = value; }
  }));
  const control = createFineTuneControl({
    container: { querySelectorAll: () => buttons },
    amounts,
    initialAmount: 99
  });
  assert.equal(control.getAmount(), 0.25);
  control.render();
  assert.deepEqual(buttons.map(button => button.pressed), ["true", "false"]);
  amounts.splice(0, 1);
  assert.equal(control.stepAmount(1), false);
});

