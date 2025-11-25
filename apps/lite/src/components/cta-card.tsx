import { cn } from "@morpho-org/uikit/lib/utils";

type CtaCardProps = {
  className?: string;
  bigText: string;
  littleText: string;
  videoSrc: { mov?: `${string}.mov`; webm: `${string}.webm` };
};

export function CtaCard({ className, bigText, littleText, videoSrc }: CtaCardProps) {
  return (
    <div
      className={cn(
        "flex w-full max-w-7xl flex-col gap-4 px-8 pt-8 md:mx-auto md:flex-row md:items-center md:justify-between",
        className,
      )}
    >
      <div className="flex h-full max-w-lg flex-col items-start justify-center gap-4 font-light">
        <h1 className="text-6xl">{bigText}</h1>
        <p className="text-secondary-foreground">{littleText}</p>
      </div>

      <video
        loop={true}
        autoPlay={true}
        muted={true}
        controls={false}
        playsInline={true}
        preload="auto"
        className="hidden aspect-auto h-[460px] md:flex"
      >
        {videoSrc.mov && <source src={videoSrc.mov} type="video/mp4; codecs=hvc1" />}
        {videoSrc.webm && <source src={videoSrc.webm} type="video/webm; codecs=vp09.00.41.08" />}
      </video>
    </div>
  );
}
