import { ArrowDown, CircleAlert } from "lucide-react";
import { ObjCol, ObjMain } from "@/components/SatchelWallet";
import { pageRows, Timeline } from "@/components/Timeline";
import { ActivityInProgress } from "@/components/client/ActivityInProgress";
import { OwnerActions, OwnerOnly, ViewerCard } from "@/components/client/SatchelPage";
import { Button, EmptyState, ExternalLink, Icon } from "@/components/ui";
import { copy } from "@/lib/copy";
import { EXPLORERS, SATCHEL_CONTRACT } from "@/lib/config";
import type { ActivityRow, SatchelSnapshot } from "@/lib/data/types";

/**
 * The Activity tab's two grid items (app-screens §4; proto app-activity.html), from the snapshot and a read of the
 * record: from 1024 the column holds the card and the owner's actions (below 1024 the compact header stands in); the
 * main block holds the partial banner, the client's In progress group, the record in UTC day groups (or the empty
 * state), Show older (a plain link, `?before=` a block) and the NearBlocks link.
 */
export function ActivityView({ snap, act, before }: { snap: SatchelSnapshot; act: { rows: ActivityRow[]; partial: boolean }; before: number | null }) {
  const id = snap.token_id;
  const page = pageRows(act.rows, before);
  const nearblocks = `${EXPLORERS.nearAccount(SATCHEL_CONTRACT)}?token=${id}`;
  const empty = !act.partial && act.rows.length === 0;
  return (
    <>
      <ObjCol lgOnly>
        <ViewerCard snap={snap} />
        <OwnerActions snap={snap} />
      </ObjCol>
      <ObjMain>
        {act.partial ? (
          <section aria-labelledby="act-partial-title" className="flex items-start gap-3 rounded-md bg-surface-sunken p-4 text-ink">
            <Icon icon={CircleAlert} size={20} className="mt-0.5" />
            <div className="flex min-w-0 flex-col gap-1">
              <h2 id="act-partial-title" className="m-0 font-sans text-label text-ink">
                {copy.act.partialTitle}
              </h2>
              <ExternalLink href={nearblocks} className="min-h-11 self-start font-semibold">
                {copy.act.partialLink}
              </ExternalLink>
            </div>
          </section>
        ) : null}
        <ActivityInProgress tokenId={id} />
        {empty ? (
          <EmptyState
            className="my-4"
            artSize={72}
            title={copy.act.empty.title}
            body={copy.act.empty.body}
            action={
              <OwnerOnly snap={snap}>
                <Button href={`/s/${id}/receive`} variant="primary" size="lg" icon={ArrowDown} className="lg:hidden">
                  {copy.page.actions.fund}
                </Button>
              </OwnerOnly>
            }
          />
        ) : (
          <Timeline rows={page.rows} />
        )}
        {empty ? null : (
          <div className="flex flex-col items-start gap-2">
            {page.next !== null ? (
              <Button href={`/s/${id}/activity?before=${page.next}`}>{copy.act.more}</Button>
            ) : before !== null ? (
              <Button href={`/s/${id}/activity`}>{copy.act.newest}</Button>
            ) : null}
            <ExternalLink href={nearblocks} className="min-h-11 py-2.5 text-[0.9375rem] leading-5 font-semibold">
              {copy.act.footer}
            </ExternalLink>
          </div>
        )}
      </ObjMain>
    </>
  );
}
