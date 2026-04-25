import uuid

GINGERGIG_NS: uuid.UUID = uuid.uuid5(uuid.NAMESPACE_DNS, "gingergig.my")


def entity_id(kind: str, slug: str) -> uuid.UUID:
    """Deterministic UUID5 for seeded entities.

    The "kind:" prefix prevents cross-table slug collisions
    (e.g. listing "siti" vs user "siti").
    """
    if not kind or not slug:
        raise ValueError("kind and slug are both required")
    return uuid.uuid5(GINGERGIG_NS, f"{kind}:{slug}")
