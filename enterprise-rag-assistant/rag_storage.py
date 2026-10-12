"""Single shared workspace persistence. No credentials or data in the web root."""
import json
import os
import sqlite3
import time
from pathlib import Path
from threading import RLock
from contextlib import contextmanager


class Store:
    def __init__(self):
        self.url = os.environ.get("DATABASE_URL", "").strip()
        self.lock = RLock()
        self.path = Path(os.environ.get("RAG_DATA_DIR", str(Path.home() / ".zhixu-rag"))) / "workspace.sqlite3"
        if not self.url:
            self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.connect() as db:
            if self.url:
                db.execute("CREATE SCHEMA IF NOT EXISTS rag_private")
            db.execute(self.sql("CREATE TABLE IF NOT EXISTS rag_objects (kind TEXT NOT NULL, id TEXT NOT NULL, payload TEXT NOT NULL, updated DOUBLE PRECISION NOT NULL, PRIMARY KEY(kind,id))"))

    @contextmanager
    def connect(self):
        if self.url:
            import psycopg
            db = psycopg.connect(self.url, connect_timeout=10, options="-c search_path=rag_private,public,extensions -c statement_timeout=20000")
        else:
            db = sqlite3.connect(self.path, timeout=15)
        try:
            with db:
                yield db
        finally:
            db.close()

    def sql(self, text):
        return text.replace("?", "%s").replace("rag_objects", "rag_private.rag_objects") if self.url else text

    def get(self, kind, key):
        with self.lock, self.connect() as db:
            row = db.execute(self.sql("SELECT payload FROM rag_objects WHERE kind=? AND id=?"), (kind, key)).fetchone()
        return json.loads(row[0]) if row else None

    def put(self, kind, key, value):
        with self.lock, self.connect() as db:
            db.execute(self.sql("INSERT INTO rag_objects(kind,id,payload,updated) VALUES(?,?,?,?) ON CONFLICT(kind,id) DO UPDATE SET payload=excluded.payload,updated=excluded.updated"), (kind, key, json.dumps(value, ensure_ascii=False), time.time()))

    def list(self, kind, limit=1000):
        with self.lock, self.connect() as db:
            rows = db.execute(self.sql("SELECT payload FROM rag_objects WHERE kind=? ORDER BY updated DESC LIMIT ?"), (kind, limit)).fetchall()
        return [json.loads(row[0]) for row in rows]

    def status(self):
        durable = bool(self.url) or not bool(os.environ.get("RENDER"))
        return {"backend": "postgresql" if self.url else "sqlite", "durable": durable,
                "message": "共享工作空间：持有访问密码的人可查看全部记录。" if self.url else
                "本机数据库保存；当前 Render 未配置持久数据库，重新部署仍可能丢失。" if not durable else "记录保存在本机数据库。"}

    def init_vectors(self):
        if not self.url:
            raise ValueError("语义检索需要配置 PostgreSQL 和 pgvector。")
        with self.connect() as db:
            # Extension installation is an administrator operation; see setup.sql.
            db.execute("CREATE TABLE IF NOT EXISTS rag_private.rag_vectors (id TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, embedding vector NOT NULL)")

    def put_vector(self, key, fingerprint, vector):
        with self.connect() as db:
            db.execute("INSERT INTO rag_private.rag_vectors(id,fingerprint,embedding) VALUES(%s,%s,%s::vector) ON CONFLICT(id) DO UPDATE SET fingerprint=excluded.fingerprint,embedding=excluded.embedding", (key, fingerprint, json.dumps(vector)))

    def vector_fingerprint(self, key):
        with self.connect() as db:
            row = db.execute("SELECT fingerprint FROM rag_private.rag_vectors WHERE id=%s", (key,)).fetchone()
        return row[0] if row else None

    def nearest(self, vector, keys, limit=20):
        if not keys:
            return []
        with self.connect() as db:
            rows = db.execute("SELECT id,fingerprint FROM rag_private.rag_vectors WHERE id=ANY(%s) AND vector_dims(embedding)=%s ORDER BY embedding <=> %s::vector LIMIT %s", (keys, len(vector), json.dumps(vector), limit)).fetchall()
        return rows
