/** Mounts and coordinates the Practice Stars application. */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Pencil,
  Settings,
  Sparkles,
  X,
} from "lucide-react";
import {
  assetStores,
  fetchConfig,
  getCachedAssetUrl,
  listAssetNames,
  syncApplauseAssets,
  syncImageAssets,
} from "./assetCache";
import { cloudSync, type SyncStatus } from "./cloudSync";
import { todayKey } from "./dateUtils";
import {
  buildCalendarDays,
  calculateStats,
  chooseRewardImage,
  createInitialState,
  dateGridColumn,
  doneDatesInOrder,
  loadTrackerState,
  saveTrackerState,
  setDayRecord,
} from "./trackerModel";
import type {
  AppConfig,
  CalendarDay,
  DateKey,
  DayRecord,
  TrackerState,
} from "./types";
import "./styles.css";

const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

type AssetProgress = {
  label: string;
  done: number;
  total: number;
};

type ViewerState = {
  date: DateKey;
  reward: boolean;
  particleMode: ParticleMode;
};

type ParticleMode = "confetti" | "fireworks" | "sparkles" | "bubbles";

type EditDialog = {
  day: CalendarDay;
};

function App() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [state, setState] = useState<TrackerState | null>(() =>
    loadTrackerState(),
  );
  const [setupOpen, setSetupOpen] = useState(false);
  const [loading, setLoading] = useState<AssetProgress | null>(null);
  const [assetError, setAssetError] = useState<string | null>(null);
  const [imageNames, setImageNames] = useState<string[]>([]);
  const [applauseNames, setApplauseNames] = useState<string[]>([]);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [editMode, setEditMode] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showBackupControls, setShowBackupControls] = useState(false);
  const [viewer, setViewer] = useState<ViewerState | null>(null);
  const [editDialog, setEditDialog] = useState<EditDialog | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentDate = todayKey();

  useEffect(() => {
    fetchConfig<AppConfig>("config.json")
      .then((loadedConfig) => {
        setConfig(loadedConfig);
        if (!state) {
          setSetupOpen(true);
        }
      })
      .catch((error: unknown) => {
        setAssetError(
          error instanceof Error
            ? error.message
            : "Unable to load app configuration.",
        );
      });
  }, [state]);

  const refreshAssetNamesAndUrls = useCallback(
    async (trackerState: TrackerState) => {
      const [loadedImageNames, loadedApplauseNames] = await Promise.all([
        listAssetNames(assetStores.images, trackerState.image_version),
        listAssetNames(assetStores.applause, trackerState.applause_version),
      ]);
      setImageNames(loadedImageNames);
      setApplauseNames(loadedApplauseNames);

      const entries = await Promise.all(
        loadedImageNames.map(async (name) => [
          name,
          await getCachedAssetUrl(
            assetStores.images,
            trackerState.image_version,
            name,
          ),
        ]),
      );
      setImageUrls(
        Object.fromEntries(
          entries.filter(
            (entry): entry is [string, string] => typeof entry[1] === "string",
          ),
        ),
      );
    },
    [],
  );

  const syncAssets = useCallback(
    async (imageVersion: string, applauseVersion: string) => {
      setAssetError(null);
      setLoading({ label: "Fetching reward pictures", done: 0, total: 1 });
      await syncImageAssets(imageVersion, (done, total) =>
        setLoading({ label: "Fetching reward pictures", done, total }),
      );
      await syncApplauseAssets(applauseVersion, (done, total) =>
        setLoading({ label: "Tuning applause", done, total }),
      );
      setLoading(null);
    },
    [],
  );

  useEffect(() => {
    if (!config || !state) {
      return;
    }

    const task = config.tasks[state.task_id];
    if (!task) {
      setAssetError("The saved task is no longer available in config.json.");
      return;
    }

    const desiredImageVersion = task.image_version;
    const desiredApplauseVersion = config.applause_version;
    const needsSync =
      desiredImageVersion !== state.image_version ||
      desiredApplauseVersion !== state.applause_version ||
      imageNames.length === 0;

    if (!needsSync) {
      void refreshAssetNamesAndUrls(state);
      return;
    }

    let cancelled = false;
    syncAssets(desiredImageVersion, desiredApplauseVersion)
      .then(async () => {
        if (cancelled) {
          return;
        }
        const updatedState = {
          ...state,
          task_name: state.task_name || task.name,
          image_version: desiredImageVersion,
          applause_version: desiredApplauseVersion,
        };
        saveAndSetState(updatedState);
        await refreshAssetNamesAndUrls(updatedState);
      })
      .catch((error: unknown) => {
        setLoading(null);
        setAssetError(
          error instanceof Error ? error.message : "Unable to download assets.",
        );
      });

    return () => {
      cancelled = true;
    };
  }, [config, imageNames.length, refreshAssetNamesAndUrls, state, syncAssets]);

  useEffect(() => {
    return () => {
      Object.values(imageUrls).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [imageUrls]);

  useEffect(() => {
    return () => {
      if (syncTimer.current) {
        clearTimeout(syncTimer.current);
      }
    };
  }, []);

  const stats = useMemo(
    () =>
      state
        ? calculateStats(state.records, state.start_date, currentDate)
        : null,
    [currentDate, state],
  );
  const days = useMemo(
    () => (state ? buildCalendarDays(state, currentDate) : []),
    [currentDate, state],
  );
  const doneDates = useMemo(
    () => (state ? doneDatesInOrder(state) : []),
    [state],
  );

  function saveAndSetState(nextState: TrackerState) {
    saveTrackerState(nextState);
    setState(nextState);
    scheduleCloudSync(nextState);
  }

  function scheduleCloudSync(nextState: TrackerState) {
    if (syncTimer.current) {
      clearTimeout(syncTimer.current);
    }
    if (!nextState.stash_password?.trim()) {
      return;
    }
    syncTimer.current = setTimeout(() => {
      void cloudSync
        .push(nextState)
        .then(() => {
          setSyncStatus({
            ok: true,
            at: new Date(),
            message: "Successfully synced",
          });
        })
        .catch((error: unknown) => {
          setSyncStatus({
            ok: false,
            at: new Date(),
            message:
              error instanceof Error ? error.message : "Unable to sync backup.",
          });
          setToast("Backup did not complete.");
        });
    }, 1000);
  }

  function updateStashPassword(password: string) {
    if (!state) {
      return;
    }
    saveAndSetState({ ...state, stash_password: password });
  }

  async function restoreFromServer() {
    if (!state) {
      return;
    }
    const confirmed = window.confirm(
      "Restore from server will replace all local practice data on this device with the server backup, then restart the app. This cannot be undone. Continue?",
    );
    if (!confirmed) {
      return;
    }

    try {
      const snapshot = await cloudSync.restore(state);
      cloudSync.applySnapshot(snapshot, state.stash_password ?? "");
      window.location.reload();
    } catch (error: unknown) {
      setSyncStatus({
        ok: false,
        at: new Date(),
        message:
          error instanceof Error ? error.message : "Unable to restore backup.",
      });
      setToast("Restore did not complete.");
    }
  }

  async function completeSetup(args: {
    userName: string;
    taskId: string;
    taskName: string;
  }) {
    if (!config) {
      return;
    }
    const task = config.tasks[args.taskId];
    const initialState = createInitialState({
      userName: args.userName,
      taskId: args.taskId,
      taskName: args.taskName || task.name,
      imageVersion: task.image_version,
      applauseVersion: config.applause_version,
    });

    try {
      await syncAssets(
        initialState.image_version,
        initialState.applause_version,
      );
      saveAndSetState(initialState);
      await refreshAssetNamesAndUrls(initialState);
      setSetupOpen(false);
    } catch (error: unknown) {
      setLoading(null);
      setAssetError(
        error instanceof Error
          ? error.message
          : "Unable to download reward assets.",
      );
    }
  }

  function markTodayDone() {
    if (!state) {
      return;
    }
    const previousStats = calculateStats(
      state.records,
      state.start_date,
      currentDate,
    );
    const existing = state.records[currentDate];
    const imageName =
      typeof existing === "string"
        ? existing
        : chooseRewardImage(imageNames, state.records);
    if (!imageName) {
      setToast("No reward pictures are available yet.");
      return;
    }
    const nextState = setDayRecord(state, currentDate, imageName);
    const nextStats = calculateStats(
      nextState.records,
      nextState.start_date,
      currentDate,
    );
    saveAndSetState(nextState);
    void playApplause();
    setViewer({
      date: currentDate,
      reward: true,
      particleMode:
        nextStats.longest_streak > previousStats.longest_streak
          ? "fireworks"
          : randomParticleMode(),
    });
  }

  function markTodaySkip() {
    if (!state) {
      return;
    }
    saveAndSetState(setDayRecord(state, currentDate, null));
    setToast("Today is marked as a good reason day.");
  }

  function updateDate(date: DateKey, record: DayRecord | undefined) {
    if (!state) {
      return;
    }
    saveAndSetState(setDayRecord(state, date, record));
  }

  function updateEditedDate(date: DateKey, value: "fail" | "skip" | "done") {
    if (!state) {
      return;
    }
    if (value === "fail") {
      updateDate(date, undefined);
    } else if (value === "skip") {
      updateDate(date, null);
    } else {
      const existing = state.records[date];
      updateDate(
        date,
        typeof existing === "string"
          ? existing
          : chooseRewardImage(imageNames, state.records),
      );
    }
    setEditDialog(null);
  }

  async function playApplause() {
    if (!state || applauseNames.length === 0) {
      return;
    }
    const name =
      applauseNames[Math.floor(Math.random() * applauseNames.length)];
    const url = await getCachedAssetUrl(
      assetStores.applause,
      state.applause_version,
      name,
    );
    if (!url) {
      return;
    }
    const audio = new Audio(url);
    audio.volume = 0.8;
    audio.play().catch(() => setToast("Tap again if your iPad blocked sound."));
    audio.addEventListener("ended", () => URL.revokeObjectURL(url), {
      once: true,
    });
  }

  function handleDayTap(day: CalendarDay) {
    if (editMode) {
      setEditDialog({ day });
      return;
    }
    if (day.state === "done") {
      setViewer({ date: day.date, reward: false, particleMode: "sparkles" });
    }
  }

  const taskLabel = state?.task_name ?? "practice";

  return (
    <main className="app-shell">
      <Header
        currentStreak={stats?.current_streak ?? 0}
        longestStreak={stats?.longest_streak ?? 0}
        onSettings={() => setSettingsOpen(true)}
        editMode={editMode}
      />

      <section className="weekday-bar top" aria-hidden="true">
        {WEEKDAYS.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </section>

      <Calendar
        days={days}
        imageUrls={imageUrls}
        onDayTap={handleDayTap}
        taskName={taskLabel}
        onDone={markTodayDone}
        onSkip={markTodaySkip}
      />

      <section className="weekday-bar bottom" aria-hidden="true">
        {WEEKDAYS.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </section>

      {setupOpen && config && (
        <SetupModal
          config={config}
          loading={loading}
          assetError={assetError}
          onSubmit={completeSetup}
        />
      )}
      {loading && !setupOpen && <LoadingOverlay progress={loading} />}
      {settingsOpen && state && (
        <SettingsModal
          state={state}
          editMode={editMode}
          showBackupControls={showBackupControls}
          onEditMode={setEditMode}
          onShowBackupControls={setShowBackupControls}
          onStashPassword={updateStashPassword}
          onRestore={restoreFromServer}
          syncStatus={syncStatus}
          onClose={() => setSettingsOpen(false)}
        />
      )}
      {viewer && state && (
        <ImageViewer
          viewer={viewer}
          doneDates={doneDates}
          records={state.records}
          imageUrls={imageUrls}
          onClose={() => setViewer(null)}
          onMove={(date) =>
            setViewer((current) =>
              current ? { ...current, date, reward: false } : null,
            )
          }
        />
      )}
      {editDialog && (
        <EditDayModal
          day={editDialog.day}
          imageUrl={
            editDialog.day.imageName
              ? imageUrls[editDialog.day.imageName]
              : undefined
          }
          onClose={() => setEditDialog(null)}
          onChoose={(value) => updateEditedDate(editDialog.day.date, value)}
        />
      )}
      {viewer?.reward && <ParticleOverlay mode={viewer.particleMode} />}
      {assetError && <div className="toast error">{assetError}</div>}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </main>
  );
}

function Header({
  currentStreak,
  longestStreak,
  editMode,
  onSettings,
}: {
  currentStreak: number;
  longestStreak: number;
  editMode: boolean;
  onSettings: () => void;
}) {
  return (
    <header className="app-header">
      <div className="streak-pill best">
        <Sparkles aria-hidden="true" />
        <span>Best streak</span>
        <strong>{longestStreak} days</strong>
      </div>
      <div className="current-streak">
        <span>Currently on</span>
        <strong>{currentStreak} day streak</strong>
      </div>
      <button
        className="icon-button settings-button"
        type="button"
        onClick={onSettings}
        aria-label="Settings"
      >
        {editMode ? (
          <Pencil aria-hidden="true" />
        ) : (
          <Settings aria-hidden="true" />
        )}
      </button>
    </header>
  );
}

function Calendar({
  days,
  imageUrls,
  taskName,
  onDayTap,
  onDone,
  onSkip,
}: {
  days: CalendarDay[];
  imageUrls: Record<string, string>;
  taskName: string;
  onDayTap: (day: CalendarDay) => void;
  onDone: () => void;
  onSkip: () => void;
}) {
  let previousMonth = "";

  return (
    <section className="calendar-scroll" aria-label="Practice calendar">
      <div className="calendar-grid">
        {days.map((day) => {
          const monthChanged = day.monthName !== previousMonth;
          previousMonth = day.monthName;
          return (
            <React.Fragment key={day.date}>
              {monthChanged && <h2 className="month-label">{day.monthName}</h2>}
              <button
                type="button"
                className={`day-cell ${day.state}`}
                style={{ gridColumn: dateGridColumn(day.date) }}
                onClick={() => onDayTap(day)}
                aria-label={`${day.date} ${day.state === "done" ? "completed" : day.state === "skip" ? "skipped" : "not done"}`}
              >
                <span className="date-number">{day.dayOfMonth}</span>
                {day.state === "skip" && (
                  <ArrowRight className="skip-arrow" aria-hidden="true" />
                )}
                {day.state === "done" &&
                  day.imageName &&
                  imageUrls[day.imageName] && (
                    <img
                      src={imageUrls[day.imageName]}
                      alt=""
                      draggable={false}
                    />
                  )}
              </button>
            </React.Fragment>
          );
        })}
        <section className="today-actions" aria-label="Today actions">
          <button className="done-button" type="button" onClick={onDone}>
            <Check aria-hidden="true" />
            <span>I did my {taskName} today</span>
          </button>
          <button className="skip-button" type="button" onClick={onSkip}>
            <ArrowRight aria-hidden="true" />
            <span>I had a good reason to skip my {taskName} today</span>
          </button>
        </section>
      </div>
    </section>
  );
}

function SetupModal({
  config,
  loading,
  assetError,
  onSubmit,
}: {
  config: AppConfig;
  loading: AssetProgress | null;
  assetError: string | null;
  onSubmit: (args: {
    userName: string;
    taskId: string;
    taskName: string;
  }) => void;
}) {
  const taskIds = Object.keys(config.tasks);
  const [userName, setUserName] = useState("");
  const [taskId, setTaskId] = useState(taskIds[0] ?? "");
  const [taskName, setTaskName] = useState(
    taskIds[0] ? config.tasks[taskIds[0]].name : "",
  );

  return (
    <div className="modal-backdrop">
      <form
        className="setup-modal modal-panel"
        onSubmit={(event) => {
          event.preventDefault();
          if (userName.trim() && taskId) {
            onSubmit({ userName, taskId, taskName });
          }
        }}
      >
        <h1>Practice Stars</h1>
        <label>
          <span>Name</span>
          <input
            value={userName}
            onChange={(event) => setUserName(event.target.value)}
            autoFocus
          />
        </label>
        <label>
          <span>Task</span>
          <select
            value={taskId}
            onChange={(event) => {
              const nextTaskId = event.target.value;
              setTaskId(nextTaskId);
              setTaskName(config.tasks[nextTaskId].name);
            }}
          >
            {taskIds.map((id) => (
              <option key={id} value={id}>
                {config.tasks[id].name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Display name</span>
          <input
            value={taskName}
            onChange={(event) => setTaskName(event.target.value)}
          />
        </label>
        {loading ? (
          <ProgressMeter progress={loading} />
        ) : (
          <button className="primary-action">Start</button>
        )}
        {assetError && <p className="error-text">{assetError}</p>}
      </form>
    </div>
  );
}

function SettingsModal({
  state,
  editMode,
  showBackupControls,
  onEditMode,
  onShowBackupControls,
  onStashPassword,
  onRestore,
  syncStatus,
  onClose,
}: {
  state: TrackerState;
  editMode: boolean;
  showBackupControls: boolean;
  onEditMode: (value: boolean) => void;
  onShowBackupControls: (value: boolean) => void;
  onStashPassword: (value: string) => void;
  onRestore: () => void;
  syncStatus: SyncStatus | null;
  onClose: () => void;
}) {
  const [stashPassword, setStashPassword] = useState(
    state.stash_password ?? "",
  );
  const logs = cloudSync.getLogs();

  return (
    <div className="modal-backdrop">
      <section className="settings-modal modal-panel">
        <button
          className="icon-button close-button"
          type="button"
          onClick={onClose}
          aria-label="Close settings"
        >
          <X aria-hidden="true" />
        </button>
        <h2>Settings</h2>
        <label className="toggle-row">
          <span>
            <strong>Edit past entries</strong>
            <small>Tap any date to change it.</small>
          </span>
          <input
            type="checkbox"
            checked={editMode}
            onChange={(event) => onEditMode(event.target.checked)}
          />
        </label>
        <button
          className="subtle-link"
          type="button"
          onClick={() => onShowBackupControls(!showBackupControls)}
        >
          Backup options
        </button>
        {showBackupControls && (
          <div className="backup-panel">
            <label>
              <span>Stash password</span>
              <input
                type="password"
                value={stashPassword}
                onChange={(event) => {
                  setStashPassword(event.target.value);
                  onStashPassword(event.target.value);
                }}
                placeholder="WebDAV password"
              />
            </label>
            {syncStatus && (
              <p className={`sync-status ${syncStatus.ok ? "ok" : "error"}`}>
                {formatSyncStatus(syncStatus)}
              </p>
            )}
            <button
              className="danger-button"
              type="button"
              disabled={!stashPassword.trim()}
              onClick={onRestore}
            >
              Restore from server
            </button>
            <div className="sync-log">
              {logs.length === 0 ? (
                <p>No backup activity yet.</p>
              ) : (
                logs.map((log) => (
                  <p key={`${log.at}-${log.message}`} className={log.level}>
                    {new Date(log.at).toLocaleTimeString()} {log.message}
                  </p>
                ))
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function formatSyncStatus(status: SyncStatus): string {
  const time = new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(status.at);
  const date = new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(status.at);
  return status.ok
    ? `${status.message} at ${time} on ${date}`
    : `Failed to sync at ${time} on ${date}: ${status.message}`;
}

function ImageViewer({
  viewer,
  doneDates,
  records,
  imageUrls,
  onClose,
  onMove,
}: {
  viewer: ViewerState;
  doneDates: DateKey[];
  records: Record<DateKey, DayRecord>;
  imageUrls: Record<string, string>;
  onClose: () => void;
  onMove: (date: DateKey) => void;
}) {
  const touchStart = useRef<number | null>(null);
  const index = doneDates.findIndex((date) => date === viewer.date);
  const imageName = records[viewer.date];
  const imageUrl =
    typeof imageName === "string" ? imageUrls[imageName] : undefined;
  const previousDate = index > 0 ? doneDates[index - 1] : null;
  const nextDate =
    index >= 0 && index < doneDates.length - 1 ? doneDates[index + 1] : null;

  function move(date: DateKey | null) {
    if (date) {
      onMove(date);
    }
  }

  return (
    <div className={`viewer-backdrop ${viewer.reward ? "reward" : ""}`}>
      <section
        className="image-viewer"
        onTouchStart={(event) => {
          touchStart.current = event.touches[0].clientX;
        }}
        onTouchEnd={(event) => {
          if (touchStart.current === null) {
            return;
          }
          const delta = event.changedTouches[0].clientX - touchStart.current;
          if (Math.abs(delta) > 50) {
            move(delta > 0 ? previousDate : nextDate);
          }
          touchStart.current = null;
        }}
      >
        <button
          className="icon-button close-button"
          type="button"
          onClick={onClose}
          aria-label="Close reward"
        >
          <X aria-hidden="true" />
        </button>
        <button
          className="viewer-arrow left"
          type="button"
          disabled={!previousDate}
          onClick={() => move(previousDate)}
          aria-label="Previous picture"
        >
          <ChevronLeft aria-hidden="true" />
        </button>
        <div className="viewer-image-frame">
          {imageUrl ? (
            <img src={imageUrl} alt="" />
          ) : (
            <LoaderCircle className="spin" aria-hidden="true" />
          )}
        </div>
        <button
          className="viewer-arrow right"
          type="button"
          disabled={!nextDate}
          onClick={() => move(nextDate)}
          aria-label="Next picture"
        >
          <ChevronRight aria-hidden="true" />
        </button>
        <div className="viewer-caption">
          {viewer.reward ? "New picture unlocked" : "Picture unlocked"} ·{" "}
          {new Date(`${viewer.date}T12:00:00`).toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </div>
      </section>
    </div>
  );
}

function EditDayModal({
  day,
  imageUrl,
  onChoose,
  onClose,
}: {
  day: CalendarDay;
  imageUrl?: string;
  onChoose: (value: "fail" | "skip" | "done") => void;
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop">
      <section className="edit-modal modal-panel">
        <button
          className="icon-button close-button"
          type="button"
          onClick={onClose}
          aria-label="Close"
        >
          <X aria-hidden="true" />
        </button>
        <h2>
          {new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </h2>
        {imageUrl && <img src={imageUrl} alt="" className="edit-preview" />}
        <div className="edit-choices">
          <button type="button" onClick={() => onChoose("done")}>
            <Check aria-hidden="true" /> Done
          </button>
          <button type="button" onClick={() => onChoose("skip")}>
            <ArrowRight aria-hidden="true" /> Good reason
          </button>
          <button type="button" onClick={() => onChoose("fail")}>
            Blank
          </button>
        </div>
      </section>
    </div>
  );
}

function LoadingOverlay({ progress }: { progress: AssetProgress }) {
  return (
    <div className="modal-backdrop">
      <section className="loading-panel modal-panel">
        <LoaderCircle className="spin" aria-hidden="true" />
        <ProgressMeter progress={progress} />
      </section>
    </div>
  );
}

function ProgressMeter({ progress }: { progress: AssetProgress }) {
  const percentage =
    progress.total === 0
      ? 0
      : Math.round((progress.done / progress.total) * 100);
  return (
    <div className="progress-meter">
      <div>
        <span>{progress.label}</span>
        <strong>{percentage}%</strong>
      </div>
      <progress value={progress.done} max={progress.total || 1} />
    </div>
  );
}

function ParticleOverlay({ mode }: { mode: ParticleMode }) {
  return (
    <div className={`particle-layer ${mode}`} aria-hidden="true">
      {Array.from({ length: 48 }, (_, index) => (
        <span
          key={index}
          style={
            {
              "--i": index,
              "--x": `${(index * 47) % 100}%`,
              "--y": `${(index * 29) % 78}%`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const id = window.setTimeout(onDone, 3200);
    return () => window.clearTimeout(id);
  }, [onDone]);

  return <div className="toast">{message}</div>;
}

function randomParticleMode(): ParticleMode {
  const modes: ParticleMode[] = ["confetti", "sparkles", "bubbles"];
  return modes[Math.floor(Math.random() * modes.length)];
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
