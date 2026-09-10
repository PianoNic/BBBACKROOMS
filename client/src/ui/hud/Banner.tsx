import { bannerText, bannerVisible } from "./state";

export function Banner() {
  return (
    <div id="banner" class={bannerVisible.value ? undefined : "hidden"}>
      {bannerText.value}
    </div>
  );
}
