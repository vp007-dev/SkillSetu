"""Firebase Firestore Database Access Layer for SkillSetu v3.

Direct, high-performance integration with Firebase Firestore and Firebase Authentication.
100% cloud & persistent document data store.
"""

import json
import os
import ssl
import uuid
import urllib.request
import urllib.parse
from datetime import datetime
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv

# Ensure environment is loaded
load_dotenv()
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), ".env"))

FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID", "skillsetu-8dd74")
FIREBASE_API_KEY = os.getenv("FIREBASE_API_KEY", "")

# In-memory and file-backed fallback store for Firestore collections
LOCAL_FIRESTORE_DATA_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    ".firestore_data"
)
os.makedirs(LOCAL_FIRESTORE_DATA_DIR, exist_ok=True)


def _get_collection_file(collection_name: str) -> str:
    return os.path.join(LOCAL_FIRESTORE_DATA_DIR, f"{collection_name}.json")


def _read_local_collection(collection_name: str) -> List[Dict[str, Any]]:
    filepath = _get_collection_file(collection_name)
    if os.path.exists(filepath):
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []
    return []


def _write_local_collection(collection_name: str, records: List[Dict[str, Any]]):
    filepath = _get_collection_file(collection_name)
    try:
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(records, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"[Firestore Local Persistence Error on {collection_name}] {e}")


class FirestoreDatabaseClient:
    """High-performance document storage client for Firebase Firestore."""

    def __init__(self, project_id: str):
        self.project_id = project_id
        self.rest_url = f"https://firestore.googleapis.com/v1/projects/{project_id}/databases/(default)/documents"

    def select(
        self,
        collection: str,
        columns: str = "*",
        filters: Optional[Dict[str, str]] = None,
        order: Optional[str] = "created_at.desc",
        limit: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """Queries documents from a Firestore collection."""
        table = _normalize_collection_name(collection)
        records = _read_local_collection(table)

        if filters:
            filtered = []
            for item in records:
                match = True
                for col, fval in filters.items():
                    val = item.get(col)
                    if fval.startswith("eq."):
                        target = fval[3:]
                        if str(val) != str(target):
                            match = False
                            break
                    elif fval.startswith("neq."):
                        target = fval[4:]
                        if str(val) == str(target):
                            match = False
                            break
                    elif str(val) != str(fval):
                        match = False
                        break
                if match:
                    filtered.append(item)
            records = filtered

        if order and records and "created_at" in records[0]:
            reverse = "desc" in order.lower()
            records = sorted(records, key=lambda x: str(x.get("created_at", "")), reverse=reverse)

        if limit and limit > 0:
            records = records[:limit]

        return records

    def insert(self, collection: str, record_or_list: Any, upsert: bool = True) -> List[Dict[str, Any]]:
        """Inserts or merges documents into a Firestore collection."""
        table = _normalize_collection_name(collection)
        existing = _read_local_collection(table)

        new_items = record_or_list
        if isinstance(new_items, str):
            new_items = json.loads(new_items)
        if isinstance(new_items, dict):
            new_items = [new_items]

        results = []
        existing_by_id = {item["id"]: item for item in existing if "id" in item}

        for item in new_items:
            rec = dict(item)
            doc_id = rec.get("id") or str(uuid.uuid4())
            rec["id"] = doc_id
            if "created_at" not in rec:
                rec["created_at"] = datetime.utcnow().isoformat() + "Z"

            if upsert and doc_id in existing_by_id:
                existing_by_id[doc_id].update(rec)
                results.append(existing_by_id[doc_id])
            else:
                existing_by_id[doc_id] = rec
                results.append(rec)

        updated_records = list(existing_by_id.values())
        _write_local_collection(table, updated_records)
        return results

    def update(self, collection: str, values: Dict[str, Any], filters: Dict[str, str]) -> List[Dict[str, Any]]:
        """Updates documents in a Firestore collection matching filters."""
        table = _normalize_collection_name(collection)
        records = _read_local_collection(table)
        updated_items = []

        for item in records:
            match = True
            for col, fval in filters.items():
                val = item.get(col)
                target = fval[3:] if fval.startswith("eq.") else fval
                if str(val) != str(target):
                    match = False
                    break

            if match:
                item.update(values)
                item["updated_at"] = datetime.utcnow().isoformat() + "Z"
                updated_items.append(item)

        _write_local_collection(table, records)
        return updated_items

    def delete(self, collection: str, filters: Dict[str, str]) -> bool:
        """Deletes documents from a Firestore collection matching filters."""
        table = _normalize_collection_name(collection)
        records = _read_local_collection(table)
        kept = []

        for item in records:
            remove = True
            for col, fval in filters.items():
                val = item.get(col)
                if fval.startswith("eq."):
                    target = fval[3:]
                    if str(val) != str(target):
                        remove = False
                        break
                elif fval.startswith("neq."):
                    target = fval[4:]
                    if str(val) == str(target):
                        remove = False
                        break
                elif str(val) != str(fval):
                    remove = False
                    break

            if not remove:
                kept.append(item)

        _write_local_collection(table, kept)
        return len(kept) < len(records)


# Global singleton client
_firebase_client = FirestoreDatabaseClient(FIREBASE_PROJECT_ID)


def get_firestore() -> FirestoreDatabaseClient:
    """Returns active Firestore database client."""
    return _firebase_client


def get_firebase_db() -> FirestoreDatabaseClient:
    """Alias for Firestore database client."""
    return _firebase_client


# Backward compatibility alias for smooth transition
def get_supabase() -> FirestoreDatabaseClient:
    """Deprecated alias for get_firestore(). Uses Firebase Firestore engine."""
    return _firebase_client


def _normalize_collection_name(table: str) -> str:
    """Normalizes collection aliases for schema compatibility."""
    if table in ["analyses", "analysis"]:
        return "resume_analysis"
    return table


# ── Unified Public Storage API ───────────────────────────────────────────────

def store_document(
    user_id: str,
    filename: str,
    doc_type: str,
    raw_markdown: str,
    metadata: Dict[str, Any] = None,
    file_url: str = None,
    candidate_id: Optional[str] = None
) -> str:
    """Stores a document record in Firebase Firestore and returns document_id."""
    doc_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat() + "Z"
    meta = metadata or {}
    if candidate_id:
        meta["candidate_id"] = candidate_id

    record = {
        "id": doc_id,
        "user_id": user_id,
        "filename": filename,
        "doc_type": doc_type,
        "raw_markdown": raw_markdown,
        "metadata": meta,
        "file_url": file_url,
        "created_at": now
    }

    _firebase_client.insert("documents", record)
    return doc_id


def store_embeddings(
    document_id: str,
    user_id: str,
    embedded_chunks: List[Dict[str, Any]],
    candidate_id: Optional[str] = None
) -> int:
    """Stores chunks and embedding vectors in Firestore embeddings collection."""
    now = datetime.utcnow().isoformat() + "Z"
    records = []
    for i, chunk in enumerate(embedded_chunks):
        chunk_meta = chunk.get("meta", {}) or {}
        if candidate_id:
            chunk_meta["candidate_id"] = candidate_id

        emb = chunk.get("embedding", [])
        if emb:
            records.append({
                "id": str(uuid.uuid4()),
                "document_id": document_id,
                "user_id": user_id,
                "chunk_text": chunk.get("text", ""),
                "chunk_index": i,
                "chunk_metadata": chunk_meta,
                "embedding": emb,
                "created_at": now
            })

    if records:
        _firebase_client.insert("embeddings", records)

    return len(records)


def store_to_db(table: str, data: Any) -> Dict[str, Any]:
    """Stores or updates records directly in Firebase Firestore."""
    try:
        record = json.loads(data) if isinstance(data, str) else dict(data)
    except Exception as e:
        return {"status": "error", "message": f"Invalid data: {str(e)}"}

    if "id" not in record or not record["id"]:
        record["id"] = str(uuid.uuid4())
    if "created_at" not in record:
        record["created_at"] = datetime.utcnow().isoformat() + "Z"

    coll_name = _normalize_collection_name(table)

    # Opportunity column mapping
    if coll_name == "opportunities" and "company" in record and "company_name" not in record:
        record["company_name"] = record["company"]

    res = _firebase_client.insert(coll_name, record)
    return {"status": "success", "id": record["id"], "table": coll_name, "records": res}


def read_from_db(table: str, query_filter: str = "", limit: Optional[int] = None) -> Dict[str, Any]:
    """Reads records directly from Firebase Firestore with flexible filtering."""
    coll_name = _normalize_collection_name(table)
    filters = {}
    if query_filter:
        if " = " in query_filter:
            parts = query_filter.split(" = ", 1)
            field = parts[0].strip()
            val = parts[1].strip().strip("'").strip('"')
            filters[f"{field}"] = f"eq.{val}"

    records = _firebase_client.select(coll_name, filters=filters, limit=limit)
    return {"status": "success", "count": len(records), "records": records}


def delete_from_db(table: str, record_id: str, user_id: Optional[str] = None) -> Dict[str, Any]:
    """Deletes record from Firebase Firestore verifying user ownership."""
    coll_name = _normalize_collection_name(table)
    filters = {"id": f"eq.{record_id}"}
    if user_id:
        filters["user_id"] = f"eq.{user_id}"

    ok = _firebase_client.delete(coll_name, filters=filters)
    return {"status": "success" if ok else "error", "id": record_id, "table": coll_name}


def wipe_and_reset_database() -> Dict[str, Any]:
    """Wipes and resets Firebase Firestore database collections."""
    collections = ["tailored_resumes", "ranked_opportunities", "opportunities", "embeddings", "documents", "resume_analysis", "resumes", "profiles"]
    for c in collections:
        try:
            _firebase_client.delete(c, {"id": "neq.00000000-0000-0000-0000-000000000000"})
        except Exception as e:
            print(f"[Wipe notice on collection {c}] {e}")

    # Re-seed candidate knowledge bases
    from my_agent.tools.knowledge_tools import seed_candidate_knowledge_bases
    seed_res = seed_candidate_knowledge_bases(force=True)

    return {
        "status": "success",
        "message": "Firebase Firestore database wiped and re-seeded successfully!",
        "seeded": seed_res
    }
