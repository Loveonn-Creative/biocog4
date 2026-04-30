import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Save, Lock, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Props {
  calculatorSlug: string;
  label?: string;
  inputs: Record<string, unknown>;
  results: Record<string, unknown>;
  factorSources: string[];
  disabled?: boolean;
}

export const SaveRunButton = ({ calculatorSlug, label, inputs, results, factorSources, disabled }: Props) => {
  const { user, isAuthenticated } = useSession();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!isAuthenticated || !user) {
      navigate('/auth');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('calculator_runs').insert({
      user_id: user.id,
      calculator_slug: calculatorSlug,
      label: label || null,
      inputs: inputs as never,
      results: results as never,
      factor_sources: factorSources as never,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't save", description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Saved', description: 'Result saved to your account.' });
    }
  };

  if (!isAuthenticated) {
    return (
      <Button variant="outline" onClick={() => navigate('/auth')} disabled={disabled}>
        <Lock className="w-4 h-4 mr-2" /> Sign in to save
      </Button>
    );
  }
  return (
    <Button variant="outline" onClick={handleSave} disabled={disabled || saving}>
      {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Save result
    </Button>
  );
};
