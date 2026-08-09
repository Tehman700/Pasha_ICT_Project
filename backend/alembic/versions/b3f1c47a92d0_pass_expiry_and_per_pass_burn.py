"""Per-pass expiry and per-pass burn

Two columns on pickup_authorizations, both used only by one-off passes and both
NULL for every standing authorization.

`expires_at` exists because `valid_until` is a DATE. A parent issuing a pass to
her brother knows he is coming between 1 and 3; a date column cannot hold that,
so every pass was live until midnight regardless. The narrower the window, the
less a forwarded screenshot is worth.

`used_at` moves single-use from the child to the pass. The previous behaviour
inferred the burn from "has this child been handed over today", which quietly
killed a second pass issued for the same child — a parent hedging between two
relatives would strand one of them at the gate with a code that had never been
scanned.

No backfill. Existing rows are standing authorizations, which have no expiry
moment and are not single-use; NULL is correct for both columns, and the
verification path reads NULL as "no per-pass limit" rather than "expired".

Revision ID: b3f1c47a92d0
Revises: 70bdc921f78f
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "b3f1c47a92d0"
down_revision: Union[str, Sequence[str], None] = "70bdc921f78f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "pickup_authorizations",
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "pickup_authorizations",
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("pickup_authorizations", "used_at")
    op.drop_column("pickup_authorizations", "expires_at")
