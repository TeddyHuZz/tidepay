import { HeroPreview } from "@/components/hero-preview";
import { PartnersBar } from "@/components/partners-bar";
import { FeatureFigures } from "@/components/feature-figures";
import { DistributionSection } from "@/components/distribution-section";
import { MetricsBar } from "@/components/metrics-bar";
import { ArchitectureFlow } from "@/components/architecture-flow";
import { FastForwardCallout } from "@/components/fast-forward-callout";
import { ChangelogGrid } from "@/components/changelog-grid";

export default function HomePage() {
  return (
    <div className="flex flex-col">
      <HeroPreview />
      <PartnersBar />
      <FeatureFigures />
      <DistributionSection />
      <MetricsBar />
      <ArchitectureFlow />
      <FastForwardCallout />
      <ChangelogGrid />
    </div>
  );
}
