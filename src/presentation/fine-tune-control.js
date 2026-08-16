import { DEFAULT_NUDGE_AMOUNT, NUDGE_AMOUNTS } from "../config/constants.js";

export function createFineTuneControl({
  container,
  amounts = NUDGE_AMOUNTS,
  initialAmount = DEFAULT_NUDGE_AMOUNT
}) {
  let selectedAmount = amounts.includes(initialAmount) ? initialAmount : amounts[0];

  function render() {
    container.querySelectorAll("button[data-nudge-amount]").forEach(button => {
      button.setAttribute("aria-pressed", String(Number(button.dataset.nudgeAmount) === selectedAmount));
    });
  }

  function getAmount() {
    return selectedAmount;
  }

  function setAmount(value) {
    const amount = Number(value);
    if (!amounts.includes(amount)) return false;
    selectedAmount = amount;
    render();
    return true;
  }

  function stepAmount(direction) {
    if (direction !== -1 && direction !== 1) return false;
    const currentIndex = amounts.indexOf(selectedAmount);
    if (currentIndex < 0) return false;

    const nextIndex = Math.min(amounts.length - 1, Math.max(0, currentIndex + direction));
    if (nextIndex === currentIndex) return false;
    return setAmount(amounts[nextIndex]);
  }

  return { getAmount, setAmount, stepAmount, render };
}

