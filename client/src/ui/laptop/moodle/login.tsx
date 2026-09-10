/** Moodle login splash shown before every Moodle challenge — mirrors
 *  moodle.backrooms-baden.ch: campus backdrop, white card with the Moodle wordmark, the
 *  expired-session notice and a prefilled login form. One click on
 *  "Anmelden" fakes a keystroke burst, then hands over to the app. */
import type { ComponentChildren } from "preact";
import { useRef, useState } from "preact/hooks";
import { Icon } from "../../Icon";
import { ChevronDown, HelpCircle } from "../../icons";

function MoodleLogin(props: { onLogin: () => void }) {
  const [pass, setPass] = useState("");
  const busy = useRef(false);

  const submit = (): void => {
    if (busy.current) return;
    busy.current = true;
    let typed = 0;
    const t = window.setInterval(() => {
      setPass((p) => p + "*");
      if (++typed >= 10) {
        window.clearInterval(t);
        window.setTimeout(props.onLogin, 200);
      }
    }, 26);
  };

  return (
    <div class="moodle-login">
      <div class="moodle-login-card">
        <div class="moodle-login-logo">Moodle</div>
        <div class="moodle-login-alert">
          Die Session ist abgelaufen. Melden Sie sich neu an.
        </div>
        <input class="moodle-login-input" type="text" value="h.ueli" readOnly />
        <input
          class="moodle-login-input pass"
          type="password"
          placeholder="Kennwort"
          readOnly
          value={pass}
        />
        <button class="moodle-login-btn" onClick={submit}>Anmelden</button>
        <div class="moodle-login-forgot">Kennwort vergessen?</div>
        <div class="moodle-login-foot">
          <span class="moodle-login-lang">
            Deutsch (de)
            <Icon node={ChevronDown} size={14} />
          </span>
          <button class="moodle-login-cookie">Cookie-Hinweis</button>
        </div>
      </div>
      <div class="moodle-login-help">
        <Icon node={HelpCircle} size={20} />
      </div>
    </div>
  );
}

/** Renders `children` behind the login splash: the splash fills the view
 *  until the player logs in, then the real app content replaces it. */
export function MoodleLoginGate(props: { children: ComponentChildren }) {
  const [loggedIn, setLoggedIn] = useState(false);
  if (!loggedIn) return <MoodleLogin onLogin={() => setLoggedIn(true)} />;
  return <>{props.children}</>;
}
