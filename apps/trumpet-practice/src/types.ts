/** Defines the configuration, tracker and cached-asset data models. */
export type DateKey = string;
export type DayRecord = string | null;

export type TaskConfig = {
  name: string;
  image_version: string;
};

export type AppConfig = {
  tasks: Record<string, TaskConfig>;
  applause_version: string;
};

export type ImageManifestItem = {
  name: string;
  url: string;
};

export type ImageManifest = {
  version: string;
  images: ImageManifestItem[];
};

export type ApplauseManifestItem = {
  name: string;
  url: string;
};

export type ApplauseManifest = {
  version: string;
  applause: ApplauseManifestItem[];
};

export type TrackerState = {
  user_name: string;
  task_id: string;
  task_name: string;
  start_date: DateKey;
  records: Record<DateKey, DayRecord>;
  cloud_uri?: string;
  stash_password?: string;
  image_version: string;
  applause_version: string;
};

export type DerivedStats = {
  current_date: DateKey;
  longest_streak: number;
  current_streak: number;
};

export type DayState = "fail" | "done" | "skip";

export type CalendarDay = {
  date: DateKey;
  dayOfMonth: number;
  monthName: string;
  startsMonth: boolean;
  state: DayState;
  imageName?: string;
};

export type CachedAsset = {
  name: string;
  blob: Blob;
  objectUrl: string;
};
