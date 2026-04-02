import { Upload, Wifi, Database, FileSpreadsheet, Check, Clock } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface DataConnectorsProps {
  includeIoT: boolean;
  onIoTChange: (checked: boolean) => void;
}

const connectors = [
  { icon: Upload, label: 'Manual Upload', desc: 'Invoice / bill upload', status: 'active' as const, key: 'manual' },
  { icon: Wifi, label: 'IoT Sensors', desc: 'Smart meter data feed', status: 'toggle' as const, key: 'iot' },
  { icon: FileSpreadsheet, label: 'Tally Import', desc: 'Accounting software sync', status: 'coming' as const, key: 'tally' },
  { icon: Database, label: 'ERP Integration', desc: 'SAP, Oracle, Zoho', status: 'coming' as const, key: 'erp' },
];

export const DataConnectors = ({ includeIoT, onIoTChange }: DataConnectorsProps) => {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium flex items-center gap-2">
        <Database className="h-4 w-4 text-primary" />
        Data Sources
        <span className="text-[10px] text-muted-foreground ml-auto">More sources = less uncertainty</span>
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {connectors.map((c) => (
          <div key={c.key} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border/50">
            <c.icon className={`h-4 w-4 ${c.status === 'active' ? 'text-success' : c.status === 'toggle' ? 'text-primary' : 'text-muted-foreground'}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{c.label}</p>
              <p className="text-[10px] text-muted-foreground">{c.desc}</p>
            </div>
            {c.status === 'active' && (
              <span className="flex items-center gap-1 text-[10px] text-success">
                <Check className="h-3 w-3" /> Active
              </span>
            )}
            {c.status === 'toggle' && (
              <Switch checked={includeIoT} onCheckedChange={onIoTChange} />
            )}
            {c.status === 'coming' && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Clock className="h-3 w-3" /> Soon
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
