"use client";

import { useEffect, useState } from "react";
import { useGameStore } from "@/store/useGameStore";
import { AppHeader } from "@/components/shell/AppHeader";
import { GamesScreen } from "@/components/schedule/GamesScreen";
import { TeamsScreen } from "@/components/teams/TeamsScreen";
import { HelpScreen } from "@/components/help/HelpScreen";
import { SetupScreen } from "@/components/setup/SetupScreen";
import { RosterScreen } from "@/components/roster/RosterScreen";
import { LiveScreen } from "@/components/hud/LiveScreen";
import { BoxScoreScreen } from "@/components/analytics/BoxScoreScreen";
import { DriveChartScreen } from "@/components/analytics/DriveChartScreen";
import { AnalyticsScreen } from "@/components/analytics/AnalyticsScreen";
import { SeasonScreen } from "@/components/analytics/SeasonScreen";
import { ReportScreen } from "@/components/analytics/ReportScreen";
import { BroadcastDashboard } from "@/components/broadcast/BroadcastDashboard";
import { WatchView } from "@/components/broadcast/WatchView";
import { PenaltyOverlay } from "@/components/overlays/PenaltyOverlay";
import { HalftimeOverlay } from "@/components/overlays/HalftimeOverlay";
import { FixPlayOverlay } from "@/components/overlays/FixPlayOverlay";
import { PlayerCardOverlay } from "@/components/overlays/PlayerCardOverlay";
import { PlayerEditOverlay } from "@/components/overlays/PlayerEditOverlay";
import { AddPlayerOverlay } from "@/components/overlays/AddPlayerOverlay";
import { FeedbackOverlay } from "@/components/overlays/FeedbackOverlay";
import { flushFeedbackQueue } from "@/lib/sync/feedback";
import { TryConversionOverlay } from "@/components/overlays/TryConversionOverlay";
import { QbPickerOverlay } from "@/components/overlays/QbPickerOverlay";
import { TimeoutOverlay } from "@/components/overlays/TimeoutOverlay";
import { KickoffOverlay } from "@/components/overlays/KickoffOverlay";

export default function Page() {
  const hydrate = useGameStore((s) => s.hydrate);
  const tick = useGameStore((s) => s.tick);
  const screen = useGameStore((s) => s.screen);
  const overlay = useGameStore((s) => s.overlay);
  const tryPending = useGameStore((s) => s.situation.tryPending);
  const broadcast = useGameStore((s) => s.broadcast);

  // Watch mode: a broadcaster / phone opened a ?watch=<id> share link — render
  // the read-only live dashboard, no app shell, no local game needed.
  const [watchId, setWatchId] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("watch");
    setWatchId(id);
  }, []);

  useEffect(() => {
    if (watchId === undefined || watchId) return; // don't hydrate in watch mode
    hydrate();
    flushFeedbackQueue().catch(() => undefined); // retry any feedback saved offline
  }, [hydrate, watchId]);

  // Single game-clock interval; the store decides whether it advances.
  useEffect(() => {
    const id = setInterval(() => tick(), 1000);
    return () => clearInterval(id);
  }, [tick]);

  if (watchId) return <WatchView cloudId={watchId} />;

  return (
    <div className="h-[100dvh] overflow-hidden flex flex-col bg-ink text-cloud font-barlow">
      <AppHeader />
      {screen === "games" && <GamesScreen />}
      {screen === "teams" && <TeamsScreen />}
      {screen === "help" && <HelpScreen />}
      {screen === "setup" && <SetupScreen />}
      {screen === "roster" && <RosterScreen />}
      {screen === "live" && <LiveScreen />}
      {screen === "box" && <BoxScoreScreen />}
      {screen === "chart" && <DriveChartScreen />}
      {screen === "analytics" && <AnalyticsScreen />}
      {screen === "season" && <SeasonScreen />}
      {screen === "report" && <ReportScreen />}

      {overlay === "pen" && <PenaltyOverlay />}
      {overlay === "half" && <HalftimeOverlay />}
      {overlay === "fix" && <FixPlayOverlay />}
      {overlay === "card" && <PlayerCardOverlay />}
      {overlay === "edit" && <PlayerEditOverlay />}
      {overlay === "addPlayer" && <AddPlayerOverlay />}
      {overlay === "feedback" && <FeedbackOverlay />}
      {overlay === "qb" && <QbPickerOverlay />}
      {overlay === "timeout" && <TimeoutOverlay />}
      {overlay === "kickoff" && <KickoffOverlay />}

      {/* Try prompt is driven by the derived situation, not the overlay flag,
          so it appears the instant a TD is committed and clears on undo. */}
      {tryPending && screen === "live" && !overlay && <TryConversionOverlay />}

      {/* Read-only live dashboard for a broadcaster / coaches box. Local now;
          becomes the shared cloud view once device sync is added. */}
      {broadcast && <BroadcastDashboard />}
    </div>
  );
}
