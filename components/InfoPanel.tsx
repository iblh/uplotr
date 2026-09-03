import * as React from "react";
import { Position } from "@prisma/client";
import { format } from "date-fns";
import { Activity, Battery, MapPin, Signal, Sun, Thermometer, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface InfoPanelProps {
  position: Position | null;
}

export function InfoPanel({ position }: InfoPanelProps) {
  const [isCopied, setIsCopied] = React.useState(false);

  const handleCopy = () => {
    if (!position) return;
    const text = `${position.lat.toFixed(6)}, ${position.lon.toFixed(6)}`;
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (!position) {
    return (
      <div className="bg-background/40 backdrop-blur-xl border border-border rounded-lg p-3 shadow-2xl text-[10px] md:text-xs font-mono text-muted-foreground text-center tracking-widest uppercase">
        Waiting...
      </div>
    );
  }

  return (
    <>
      {/* MOBILE: Vertical Stack (Bottom-Right) */}
      <div className="md:hidden flex flex-col gap-2 items-end">
        
        {/* Battery */}
        {position.battery !== null && (
           <div className="bg-background/80 backdrop-blur-md border border-border rounded-md px-3 py-1 flex items-center gap-2 shadow-lg">
             <span className={cn("text-xs font-mono font-bold", position.battery < 20 ? "text-red-500" : "text-green-500")}>{position.battery}%</span>
             <Battery className={cn("w-3 h-3", position.battery < 20 ? "text-red-500" : "text-green-500")} />
           </div>
        )}

        {/* Telemetry Group */}
        <div className="bg-background/80 backdrop-blur-md border border-border rounded-md p-2 flex flex-col gap-2 shadow-lg w-[100px]">
           {position.temp !== null && (
             <div className="flex items-center justify-between text-xs font-mono">
               <span className="text-muted-foreground text-[10px]">TMP</span>
               <span className="text-orange-500">{position.temp.toFixed(1)}°</span>
             </div>
           )}
           {position.light !== null && (
             <div className="flex items-center justify-between text-xs font-mono">
               <span className="text-muted-foreground text-[10px]">LUX</span>
               <span className="text-yellow-500">{position.light.toFixed(0)}</span>
             </div>
           )}
           {position.snr !== null && (
             <div className="flex items-center justify-between text-xs font-mono">
               <span className="text-muted-foreground text-[10px]">SNR</span>
               <span className="text-indigo-500">{position.snr.toFixed(1)}</span>
             </div>
           )}
           {position.rssi !== null && (
             <div className="flex items-center justify-between text-xs font-mono">
               <span className="text-muted-foreground text-[10px]">RSSI</span>
               <span className={cn(position.rssi > -100 ? "text-green-500" : "text-red-500")}>
                 {position.rssi}
               </span>
             </div>
           )}
        </div>
      </div>

      {/* DESKTOP: Minimalist Card */}
      <div className="hidden md:flex flex-col w-[300px] bg-background/80 backdrop-blur-xl border border-border rounded-lg shadow-2xl p-5 gap-4 select-none transition-all hover:bg-background/90">
        
        {/* Header: Date/Time & Battery */}
        <div className="flex items-center justify-between">
           <div className="flex flex-col">
              <span className="text-sm font-medium text-foreground tracking-wide">
                {format(new Date(position.ts), "HH:mm:ss")}
              </span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                {format(new Date(position.ts), "MMM d, yyyy")}
              </span>
           </div>
           {position.battery !== null && (
             <div className="flex items-center gap-2 bg-secondary/50 px-2.5 py-1 rounded-md border border-border">
                <span className={cn("text-xs font-mono font-medium", position.battery < 20 ? "text-red-500" : "text-green-500")}>
                  {position.battery}%
                </span>
                <Battery className={cn("w-3.5 h-3.5", position.battery < 20 ? "text-red-500" : "text-green-500")} />
             </div>
           )}
        </div>

        {/* Metrics Grid - Clean & Airy */}
        <div className="grid grid-cols-2 gap-y-3 gap-x-4">
           {/* Left Col */}
           <div className="space-y-3">
              <div className="flex items-center justify-between group">
                 <div className="flex items-center gap-2 text-muted-foreground group-hover:text-orange-500 transition-colors">
                    <Thermometer className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-medium">Temp</span>
                 </div>
                 <span className="text-xs font-mono text-foreground/80">{position.temp?.toFixed(1) ?? '--'}°C</span>
              </div>
              <div className="flex items-center justify-between group">
                 <div className="flex items-center gap-2 text-muted-foreground group-hover:text-yellow-500 transition-colors">
                    <Sun className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-medium">Light</span>
                 </div>
                 <span className="text-xs font-mono text-foreground/80">{position.light?.toFixed(0) ?? '--'} Lx</span>
              </div>
           </div>
           
           {/* Right Col */}
           <div className="space-y-3">
              <div className="flex items-center justify-between group">
                 <div className="flex items-center gap-2 text-muted-foreground group-hover:text-indigo-500 transition-colors">
                    <Activity className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-medium">SNR</span>
                 </div>
                 <span className="text-xs font-mono text-foreground/80">{position.snr?.toFixed(1) ?? '--'} dB</span>
              </div>
              <div className="flex items-center justify-between group">
                 <div className="flex items-center gap-2 text-muted-foreground group-hover:text-green-500 transition-colors">
                    <Signal className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-medium">RSSI</span>
                 </div>
                 <span className="text-xs font-mono text-foreground/80">{position.rssi ?? '--'} dBm</span>
              </div>
           </div>
        </div>

        {/* Footer: Location */}
        <div 
          onClick={handleCopy}
          className="pt-3 border-t border-border flex items-center gap-2 text-muted-foreground/60 cursor-pointer hover:text-foreground/80 transition-colors group/copy"
        >
           {isCopied ? (
             <>
               <Check className="w-3.5 h-3.5 text-green-500" />
               <span className="text-[10px] font-mono tracking-wide text-green-500 font-bold animate-in fade-in slide-in-from-left-1">
                 Copied to clipboard
               </span>
             </>
           ) : (
             <>
               <MapPin className="w-3.5 h-3.5 group-hover/copy:text-foreground/80 transition-colors" />
               <span className="text-[10px] font-mono tracking-wide text-muted-foreground group-hover/copy:text-foreground transition-colors">
                 {position.lat.toFixed(6)}, {position.lon.toFixed(6)}
               </span>
             </>
           )}
        </div>

      </div>
    </>
  );
}
