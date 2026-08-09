import mongoose from "mongoose";

// ── Connection (cached for serverless / hot reload) ─────────────────
const cached = (globalThis._narcoMongoose ||= { conn: null, promise: null });

export async function dbConnect() {
  if (cached.conn) return cached.conn;
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw Object.assign(new Error("MONGODB_URI is not set — see .env.example"), { status: 500 });
  }
  cached.promise ||= mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  cached.conn = await cached.promise;
  return cached.conn;
}

const { Schema } = mongoose;
const model = (name, schema) => mongoose.models[name] || mongoose.model(name, schema);

// ── Models ──────────────────────────────────────────────────────────

export const User = model(
  "User",
  new Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  })
);

export const Settings = model(
  "Settings",
  new Schema({
    userId: { type: Schema.Types.ObjectId, ref: "User", unique: true, index: true },
    tz: { type: String, default: "Asia/Kolkata" },
    startDate: { type: String, default: "" }, // protocol Day 1 (YYYY-MM-DD); empty = signup day
    personName: { type: String, default: "" },
    bedTime: { type: String, default: "00:30" },
    gameLimit: { type: Number, default: 120 },
    appsTarget: { type: Number, default: 10 },
    trackSmoking: { type: Boolean, default: true }, // off = hide the smoking tracker + its data everywhere
    emailEnabled: { type: Boolean, default: true },
    remindEmail: { type: String, default: "" },
    morningTime: { type: String, default: "07:00" },
    eveningTime: { type: String, default: "21:30" },
    nagMin: { type: Number, default: 30 },
  })
);

// kind: 'check' | 'counter' (loggable) or computed system kinds:
// 'apps' | 'gym' | 'oats' | 'clean' | 'game' | 'sleep' | 'person' | 'calls'
export const Habit = model(
  "Habit",
  new Schema({
    userId: { type: Schema.Types.ObjectId, index: true },
    kind: { type: String, default: "check" },
    name: { type: String, required: true },
    emoji: { type: String, default: "⭐" },
    target: { type: Number, default: 1 },
    unit: { type: String, default: "" },
    reminder: { type: String, default: "" }, // "HH:MM" or ""
    days: { type: String, default: "1111111" }, // Mon..Sun mask
    sort: { type: Number, default: 100 },
    active: { type: Boolean, default: true },
    isSystem: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  })
);

const habitLogSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, index: true },
  habitId: { type: Schema.Types.ObjectId, index: true },
  date: { type: String, index: true },
  value: { type: Number, default: 1 },
  at: { type: Date, default: Date.now },
});
habitLogSchema.index({ habitId: 1, date: 1 }, { unique: true });
export const HabitLog = model("HabitLog", habitLogSchema);

export const Application = model(
  "Application",
  new Schema(
    {
      userId: { type: Schema.Types.ObjectId, index: true },
      company: { type: String, required: true, trim: true },
      role: { type: String, default: "", trim: true },
      link: { type: String, default: "" },
      source: { type: String, default: "" },
      status: { type: String, default: "applied" }, // applied | replied | interview | offer | rejected
      notes: { type: String, default: "" },
      date: { type: String, index: true }, // protocol date applied
    },
    { timestamps: true }
  )
);

export const Call = model(
  "Call",
  new Schema({
    userId: { type: Schema.Types.ObjectId, index: true },
    person: { type: String, required: true, trim: true },
    phone: { type: String, default: "" },
    about: { type: String, default: "" },
    date: { type: String, index: true }, // real calendar date due
    time: { type: String, default: "10:00" },
    status: { type: String, default: "pending" }, // pending | done
    lastNag: { type: Number, default: 0 }, // epoch ms of last nag email
    doneAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
  })
);

export const Task = model(
  "Task",
  new Schema({
    userId: { type: Schema.Types.ObjectId, index: true },
    title: { type: String, required: true, trim: true },
    date: { type: String, index: true },
    done: { type: Boolean, default: false },
    start: { type: String, default: "" }, // "HH:MM" — optional "worked from→to", locked at creation
    end: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
  })
);

const foodSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, index: true },
  date: { type: String, index: true },
  meal: { type: String }, // breakfast | lunch | snacks | dinner
  items: { type: String, default: "" },
  clean: { type: Boolean, default: true },
  oats: { type: Boolean, default: false },
  kcal: { type: Number, default: 0 },
  protein: { type: Number, default: 0 }, // grams
  carbs: { type: Number, default: 0 }, // grams
  fat: { type: Number, default: 0 }, // grams
  at: { type: Date, default: Date.now },
});
foodSchema.index({ userId: 1, date: 1, meal: 1 }, { unique: true });
export const FoodLog = model("FoodLog", foodSchema);

const gymSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, index: true },
  date: { type: String, index: true },
  type: { type: String, default: "full" }, // push | pull | legs | cardio | full | sport | rest
  minutes: { type: Number, default: 60 },
  start: { type: String, default: "" }, // "HH:MM" — optional, locked once set (delete to redo)
  end: { type: String, default: "" },
  note: { type: String, default: "" },
  at: { type: Date, default: Date.now },
});
gymSchema.index({ userId: 1, date: 1 }, { unique: true });
export const GymLog = model("GymLog", gymSchema);

export const GameLog = model(
  "GameLog",
  new Schema({
    userId: { type: Schema.Types.ObjectId, index: true },
    date: { type: String, index: true },
    minutes: { type: Number, required: true },
    start: { type: String, default: "" }, // "HH:MM" — optional; entries are add/delete only, so times are immutable
    end: { type: String, default: "" },
    game: { type: String, default: "" },
    at: { type: Date, default: Date.now },
  })
);

const sleepSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, index: true },
  date: { type: String, index: true }, // protocol date the bedtime closes
  time: { type: String, required: true }, // "HH:MM"
  at: { type: Date, default: Date.now },
});
sleepSchema.index({ userId: 1, date: 1 }, { unique: true });
export const SleepLog = model("SleepLog", sleepSchema);

export const PersonLog = model(
  "PersonLog",
  new Schema({
    userId: { type: Schema.Types.ObjectId, index: true },
    date: { type: String, index: true },
    person: { type: String, required: true, trim: true },
    minutes: { type: Number, default: 30 },
    at: { type: Date, default: Date.now },
  })
);

// Quit-smoking ledger — one running count per protocol day. Gated by settings.trackSmoking.
const smokeSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, index: true },
  date: { type: String, index: true },
  count: { type: Number, default: 0 }, // cigarettes smoked that day
  at: { type: Date, default: Date.now },
});
smokeSchema.index({ userId: 1, date: 1 }, { unique: true });
export const SmokeLog = model("SmokeLog", smokeSchema);

const emailLogSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, index: true },
  key: { type: String },
  sentAt: { type: Date, default: Date.now },
});
emailLogSchema.index({ userId: 1, key: 1 }, { unique: true });
export const EmailLog = model("EmailLog", emailLogSchema);
