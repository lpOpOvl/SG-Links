CREATE TABLE IF NOT EXISTS visits (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  ts      INTEGER NOT NULL,
  country TEXT    NOT NULL DEFAULT 'XX',
  device  TEXT    NOT NULL DEFAULT 'desktop',
  mode    TEXT    NOT NULL DEFAULT 'home',
  session TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_visits_ts      ON visits(ts);
CREATE INDEX IF NOT EXISTS idx_visits_session ON visits(session);
CREATE INDEX IF NOT EXISTS idx_visits_country ON visits(country);
CREATE INDEX IF NOT EXISTS idx_visits_mode    ON visits(mode);
