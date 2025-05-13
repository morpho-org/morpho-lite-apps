export function CtaCard({
  className,
  bigText,
  littleText,
  videoSrc,
}: {
  className: string;
  bigText: string;
  littleText: string;
  videoSrc: { mov?: `${string}.mov`; webm: `${string}.webm` };
}) {
  return (
    <div className={className}>
      <div className="flex h-full max-w-lg flex-col items-start justify-center gap-4">
        <h1 className="text-6xl font-light">{bigText}</h1>
        <h2 className="text-secondary-foreground font-light">{littleText}</h2>
      </div>
      <div className="hidden items-center justify-end md:mr-[-16px] md:flex">
        <video
          loop={true}
          autoPlay={true}
          muted={true}
          controls={false}
          playsInline={true}
          preload="metadata"
          className="aspect-auto h-[460px]"
        >
          {videoSrc.mov && <source src={videoSrc.mov} type="video/mp4; codecs=hvc1" />}
          {videoSrc.webm && <source src={videoSrc.webm} type="video/webm; codecs=vp09.00.41.08" />}
        </video>
      </div>
    </div>
  );
}
