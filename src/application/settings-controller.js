export function createSettingsController({ state, playback, syncAndRender }) {
  function setLoop(enabled) {
    state.loop = !!enabled;
    syncAndRender();
  }

  function setUseSectionSpeed(enabled) {
    state.useSectionSpeed = !!enabled;
    playback.applyActiveSpeed();
    syncAndRender();
  }

  function setMoveToNextSection(enabled) {
    state.moveToNextSection = !!enabled;
    syncAndRender();
  }

  return { setLoop, setUseSectionSpeed, setMoveToNextSection };
}

