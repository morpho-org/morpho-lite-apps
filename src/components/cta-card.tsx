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
      <div className="flex h-full flex-col items-start justify-center gap-4 md:ml-8">
        <h1 className="text-5xl font-light">{bigText}</h1>
        <h2 className="font-light">{littleText}</h2>
      </div>
      <div className="hidden items-center justify-end md:flex md:max-h-72">
        <video loop={true} autoPlay={true} preload="metadata" playsInline={true} className="aspect-square h-full">
          {videoSrc.mov && <source src={videoSrc.mov} type="video/mp4; codecs='hvc1'" />}
          {videoSrc.webm && <source src={videoSrc.webm} type="video/webm; codecs=vp09.00.41.08" />}
        </video>
      </div>
    </div>
  );
}
