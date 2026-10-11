import { ReportWizard } from "@/components/ReportWizard";
import { getLocale } from "@/lib/i18n-server";
import { messagesFor } from "@/lib/i18n";

export default async function ReportPage() {
  const locale = await getLocale();
  return <ReportWizard locale={locale} copy={messagesFor(locale)} />;
}
