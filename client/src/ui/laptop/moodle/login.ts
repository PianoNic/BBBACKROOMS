/** Moodle login splash shown before every Moodle challenge — mirrors
 *  moodle.bbbaden.ch: campus backdrop, white card with the BBB logo, the
 *  expired-session notice and a prefilled login form. One click on
 *  "Anmelden" fakes a keystroke burst, then hands over to the app. */
import { el } from "../../dom";
import { icon, ChevronDown, HelpCircle } from "../../icons";

export function buildMoodleLogin(onLogin: () => void): HTMLDivElement {
  const wrap = el<HTMLDivElement>("div", "moodle-login");
  const card = el<HTMLDivElement>("div", "moodle-login-card");

  const logo = document.createElement("img");
  logo.className = "moodle-login-logo";
  logo.src = "/bbb-logo.jpg";
  logo.alt = "BBB Berufsfachschule";
  card.appendChild(logo);

  card.appendChild(el(
    "div", "moodle-login-alert",
    "Die Session ist abgelaufen. Melden Sie sich neu an.",
  ));

  const user = el<HTMLInputElement>("input", "moodle-login-input");
  user.type = "text";
  user.value = "n.erismann.inf22";
  user.readOnly = true;
  card.appendChild(user);

  const pass = el<HTMLInputElement>("input", "moodle-login-input pass");
  pass.type = "password";
  pass.placeholder = "Kennwort";
  pass.readOnly = true;
  card.appendChild(pass);

  const submit = el<HTMLButtonElement>("button", "moodle-login-btn", "Anmelden");
  let busy = false;
  submit.onclick = () => {
    if (busy) return;
    busy = true;
    let typed = 0;
    const t = window.setInterval(() => {
      pass.value += "*";
      if (++typed >= 10) {
        window.clearInterval(t);
        window.setTimeout(onLogin, 200);
      }
    }, 26);
  };
  card.appendChild(submit);

  card.appendChild(el("div", "moodle-login-forgot", "Kennwort vergessen?"));

  const foot = el<HTMLDivElement>("div", "moodle-login-foot");
  const lang = el<HTMLSpanElement>("span", "moodle-login-lang", "Deutsch (de)");
  lang.appendChild(icon(ChevronDown, 14));
  foot.appendChild(lang);
  foot.appendChild(el("button", "moodle-login-cookie", "Cookie-Hinweis"));
  card.appendChild(foot);

  wrap.appendChild(card);

  const help = el<HTMLDivElement>("div", "moodle-login-help");
  help.appendChild(icon(HelpCircle, 20));
  wrap.appendChild(help);
  return wrap;
}

/** Mount `build` behind the login splash: the splash fills `root` until the
 *  player logs in, then the real app content replaces it. */
export function mountWithLogin(root: HTMLDivElement, build: () => void): void {
  root.appendChild(buildMoodleLogin(() => {
    root.replaceChildren();
    build();
  }));
}
