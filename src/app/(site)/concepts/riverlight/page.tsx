import { permanentRedirect } from "next/navigation";

export default function LegacyConceptRedirectPage() {
  permanentRedirect("/");
}
