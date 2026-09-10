import { useEffect, useRef, useState } from "preact/hooks";
import { deleteAccount } from "../../../net/auth";
import { Button, TextInput } from "../components/controls";
import { Modal, Overlay } from "../components/Overlay";
import { Heading } from "../components/layout";
import { account } from "../state/account";
import {
  ensureName, fileToAvatarDataUrl, playerAvatar, playerName, sampleCornerColor,
  setPlayerAvatar, setPlayerName, getStoredColor,
} from "../state/profile";
import { deleteAccountOpen } from "../routes";

export function ProfilePanel() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [sideColor, setSideColor] = useState<string>(getStoredColor());

  useEffect(() => { ensureName(); }, []);

  const avatar = playerAvatar.value;

  useEffect(() => {
    if (!avatar) {
      setSideColor(getStoredColor());
      return;
    }
    void sampleCornerColor(avatar)
      .then(setSideColor)
      .catch(() => setSideColor(getStoredColor()));
  }, [avatar]);

  const faceStyle = { background: sideColor };

  return (
    <div class="profile-panel bb-panel">
      <div class="bb-subheading">PROFILE</div>
      <div class="bb-field p-name-row">
        <label for="profile-name">Name</label>
        <TextInput
          id="profile-name"
          placeholder="your name"
          maxLength={24}
          value={playerName.value}
          onInput={(e) => setPlayerName((e.target as HTMLInputElement).value)}
        />
      </div>
      <div class="p-avatar-stage">
        <div class="p-cube">
          <div class="face front" style={avatar ? { background: "transparent" } : faceStyle}>
            {avatar ? <img class="p-cube-face-img" src={avatar} alt="" /> : null}
          </div>
          <div class="face back" style={faceStyle} />
          <div class="face left" style={faceStyle} />
          <div class="face right" style={faceStyle} />
          <div class="face top" style={faceStyle} />
          <div class="face bottom" style={faceStyle} />
        </div>
      </div>
      <Button class="change-avatar" onClick={() => fileRef.current?.click()}>CHANGE AVATAR</Button>
      <input
        ref={fileRef}
        class="file-input-hidden"
        type="file"
        accept="image/*"
        onChange={async (e) => {
          const input = e.target as HTMLInputElement;
          const file = input.files?.[0];
          input.value = "";
          if (!file) return;
          setPlayerAvatar(await fileToAvatarDataUrl(file));
        }}
      />
      {account.value ? (
        <Button
          variant="danger"
          class="delete-account"
          onClick={() => { deleteAccountOpen.value = true; }}
        >
          KONTO LÖSCHEN
        </Button>
      ) : null}
      {deleteAccountOpen.value ? <DeleteAccountDialog /> : null}
    </div>
  );
}

function DeleteAccountDialog() {
  const [busy, setBusy] = useState(false);
  const close = () => { deleteAccountOpen.value = false; };
  return (
    <Overlay id="delete-account-modal" onClose={close}>
      <Modal>
        <Heading>KONTO LÖSCHEN</Heading>
        <p class="modal-text">
          Konto und aller Fortschritt (XP, Coins, Cosmetics, Achievements) werden endgültig
          gelöscht. Fortfahren?
        </p>
        <div class="modal-footer">
          <Button variant="back" onClick={close}>← ABBRECHEN</Button>
          <Button
            variant="danger"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await deleteAccount();
              location.reload();
            }}
          >
            LÖSCHEN
          </Button>
        </div>
      </Modal>
    </Overlay>
  );
}
