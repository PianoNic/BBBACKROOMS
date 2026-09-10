import { useEffect } from "preact/hooks";
import { playSfx, unlockAudio } from "../../../core/audio";
import { loginUrl } from "../../../net/auth";
import { account, accountLoaded, loginStatus, providers, refreshAccount, signOut } from "../state/account";
import { hasUnread, loadNews } from "../state/news";
import { MenuButton } from "../components/controls";
import { navigate } from "../routes";

export function TitleScreen() {
  useEffect(() => { void refreshAccount(); }, []);
  useEffect(() => { void loadNews(); }, []);

  const acc = account.value;
  const provs = providers.value;

  return (
    <div class="title-main">
      <nav class="menu" aria-label="Hauptmenü">
        <MenuButton class="primary" onClick={() => navigate("servers")}>PLAY</MenuButton>
        <MenuButton onClick={() => navigate("shop")}>SHOP</MenuButton>
        <MenuButton onClick={() => navigate("options")}>OPTIONS</MenuButton>
        <MenuButton onClick={() => navigate("tutorial")}>TUTORIAL</MenuButton>
        <MenuButton onClick={() => navigate("news")}>
          NEWS
          {hasUnread.value ? <span class="news-dot" aria-label="Neu" /> : null}
        </MenuButton>
      </nav>
      <div class="title-aside">
        <div class="account-widget">
          {acc ? (
            <div class="account-chip">
              <span class="acc-name">{acc.displayName || "Signed in"}</span>
              <span class="acc-stats">{`Lv ${acc.level} · ${acc.coins}₵`}</span>
              <button type="button" class="acc-signout" onClick={() => void signOut()}>Sign out</button>
            </div>
          ) : (
            <>
              {loginStatus === "error" ? (
                <span class="acc-note error">Sign-in failed</span>
              ) : null}
              {loginStatus === "blocked" ? (
                <span class="acc-note error">
                  Dieses Konto wurde gesperrt. Kontakt: kontakt@backrooms-baden.ch
                </span>
              ) : null}
              {accountLoaded.value && provs.google ? (
                <button
                  type="button"
                  class="acc-login google"
                  onClick={() => { location.href = loginUrl("google"); }}
                >
                  Sign in with Google
                </button>
              ) : null}
              {accountLoaded.value && provs.microsoft ? (
                <button
                  type="button"
                  class="acc-login microsoft"
                  onClick={() => { location.href = loginUrl("microsoft"); }}
                >
                  Sign in with Microsoft
                </button>
              ) : null}
            </>
          )}
        </div>
        <a
          class="menu-legal-link"
          href="/datenschutz.html"
          target="_blank"
          rel="noopener noreferrer"
        >
          Datenschutz
        </a>
      </div>
    </div>
  );
}

export function TitleLogo() {
  return (
    <h1
      onClick={() => {
        unlockAudio();
        playSfx("/sounds/actions/logo-sting.ogg", 0.85);
      }}
    >
      BACKROOMS BADEN
    </h1>
  );
}
