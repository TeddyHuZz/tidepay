import { HeroPreview } from "@/components/hero-preview";
import { PartnersBar } from "@/components/partners-bar";
import { FeatureFigures } from "@/components/feature-figures";
import { DistributionSection } from "@/components/distribution-section";
import { SubscriberSection } from "@/components/subscriber-section";
import { DeveloperApiSection } from "@/components/developer-api-section";
import { DeveloperGuideSection } from "@/components/developer-guide-section";
import { ChangelogGrid } from "@/components/changelog-grid";

export default function HomePage() {
  return (
    <div className="flex flex-col">
      <HeroPreview />
      <PartnersBar />
      <FeatureFigures />
      <DistributionSection />
      <SubscriberSection />
      <DeveloperApiSection />
      <DeveloperGuideSection />
      <ChangelogGrid />
    </div>
  );
}
