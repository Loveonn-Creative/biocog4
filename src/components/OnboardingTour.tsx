import { useState, useEffect } from 'react';
import { X, ChevronRight, Upload, Shield, Coins, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  position: 'center' | 'bottom';
}

const tourSteps: TourStep[] = [
  {
    id: 'upload',
    title: 'Upload Your Invoice',
    description: 'Drop any invoice, bill, or receipt. We extract carbon data automatically.',
    icon: <Upload className="h-6 w-6" />,
    position: 'center',
  },
  {
    id: 'verify',
    title: 'AI Verification',
    description: 'Our AI verifies emissions and checks for greenwashing risks.',
    icon: <Shield className="h-6 w-6" />,
    position: 'center',
  },
  {
    id: 'monetize',
    title: 'Monetize Credits',
    description: 'Turn verified emissions into carbon credits, green loans, or incentives.',
    icon: <Coins className="h-6 w-6" />,
    position: 'center',
  },
];

interface OnboardingTourProps {
  currentStep?: 'upload' | 'processing' | 'verify' | 'monetize';
  onComplete?: () => void;
}

export const OnboardingTour = ({ currentStep = 'upload', onComplete }: OnboardingTourProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  useEffect(() => {
    const hasCompletedTour = localStorage.getItem('senseible_onboarding_complete');
    if (!hasCompletedTour) {
      setIsVisible(true);
    }
  }, []);

  useEffect(() => {
    // Auto-advance based on current page
    const stepMap: Record<string, number> = {
      upload: 0,
      processing: 0,
      verify: 1,
      monetize: 2,
    };
    if (currentStep && stepMap[currentStep] !== undefined) {
      setActiveStepIndex(stepMap[currentStep]);
    }
  }, [currentStep]);

  const handleNext = () => {
    if (activeStepIndex < tourSteps.length - 1) {
      setActiveStepIndex(activeStepIndex + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    localStorage.setItem('senseible_onboarding_complete', 'true');
    setIsVisible(false);
    onComplete?.();
  };

  const handleComplete = () => {
    localStorage.setItem('senseible_onboarding_complete', 'true');
    setIsVisible(false);
    onComplete?.();
  };

  if (!isVisible) return null;

  const currentTourStep = tourSteps[activeStepIndex];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm pointer-events-auto" />
      
      {/* Tour Card */}
      <Card className="relative z-10 w-[90%] max-w-md p-6 bg-card border-border shadow-2xl pointer-events-auto animate-fade-in">
        {/* Close button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close tour"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 mb-6">
          {tourSteps.map((_, index) => (
            <div
              key={index}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                index <= activeStepIndex ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4">
            {currentTourStep.icon}
          </div>
          
          <h3 className="text-xl font-semibold text-foreground mb-2">
            {currentTourStep.title}
          </h3>
          
          <p className="text-muted-foreground mb-6">
            {currentTourStep.description}
          </p>

          {/* Step indicator */}
          <p className="text-xs text-muted-foreground mb-4">
            Step {activeStepIndex + 1} of {tourSteps.length}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            className="text-muted-foreground"
          >
            Skip tour
          </Button>
          
          <Button
            onClick={handleNext}
            size="sm"
            className="gap-2"
          >
            {activeStepIndex === tourSteps.length - 1 ? (
              <>
                <CheckCircle className="h-4 w-4" />
                Get Started
              </>
            ) : (
              <>
                Next
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>

        {/* Don't show again option */}
        <button
          onClick={handleSkip}
          className="w-full mt-4 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Don't show this again
        </button>
      </Card>
    </div>
  );
};
