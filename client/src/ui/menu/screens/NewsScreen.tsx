import { useEffect, useState } from "preact/hooks";
import { Button } from "../components/controls";
import { Heading, Panel } from "../components/layout";
import { navigate } from "../routes";
import { markNewsSeen } from "../state/news";
import { AnnouncementsTab } from "./news/AnnouncementsTab";
import { ChangelogTab } from "./news/ChangelogTab";

type NewsTab = "announcements" | "changelog";

export function NewsScreen() {
  const [tab, setTab] = useState<NewsTab>("announcements");

  useEffect(() => () => markNewsSeen(), []);

  function goBack(): void {
    markNewsSeen();
    navigate("title", "back");
  }

  return (
    <Panel class="news-panel">
      <Heading>NEWS</Heading>
      <div class="bb-tabs" role="tablist" aria-label="News">
        <button
          type="button"
          role="tab"
          id="news-tab-announcements"
          aria-selected={tab === "announcements"}
          aria-controls="news-panel-announcements"
          class={tab === "announcements" ? "bb-tab active" : "bb-tab"}
          onClick={() => setTab("announcements")}
        >
          Ankündigungen
        </button>
        <button
          type="button"
          role="tab"
          id="news-tab-changelog"
          aria-selected={tab === "changelog"}
          aria-controls="news-panel-changelog"
          class={tab === "changelog" ? "bb-tab active" : "bb-tab"}
          onClick={() => setTab("changelog")}
        >
          Änderungen
        </button>
      </div>
      <div class="news-body bb-scroll">
        {tab === "announcements" ? (
          <div role="tabpanel" id="news-panel-announcements" aria-labelledby="news-tab-announcements">
            <AnnouncementsTab />
          </div>
        ) : (
          <div role="tabpanel" id="news-panel-changelog" aria-labelledby="news-tab-changelog">
            <ChangelogTab />
          </div>
        )}
      </div>
      <Button variant="back" class="screen-back" onClick={goBack}>
        ← BACK
      </Button>
    </Panel>
  );
}
