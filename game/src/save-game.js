// SOLMARINA — save and load. One small JSON blob in localStorage holds Rae's
// money, mission progress and position, so a session survives a closed tab.
// Storage is best-effort: a blocked store never stops the game.

const SAVE_KEY = 'solmarina-save-v1';

export function createSave() {
  function read() {
    try {
      const raw = window.localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || typeof data !== 'object') return null;
      return data;
    } catch (err) {
      void err;
      return null;
    }
  }

  function write(data) {
    try {
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      return true;
    } catch (err) {
      void err;
      return false;
    }
  }

  return {
    key: SAVE_KEY,

    save(state) {
      return write({
        version: 1,
        savedAt: Date.now(),
        earned: state.earned,
        missionIndex: state.missionIndex,
        debtsDone: state.debtsDone,
        playerX: state.playerX,
        playerZ: state.playerZ,
        health: state.health,
      });
    },

    load() {
      return read();
    },

    hasSave() {
      return read() !== null;
    },

    clear() {
      try {
        window.localStorage.removeItem(SAVE_KEY);
        return true;
      } catch (err) {
        void err;
        return false;
      }
    },
  };
}
