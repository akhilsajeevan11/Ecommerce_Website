import React from 'react';
import { Check } from 'lucide-react';

const STEPS = [
  { id: 'shipping', label: 'Shipping' },
  { id: 'payment', label: 'Payment' },
  { id: 'review', label: 'Review' }
];

/**
 * StepIndicator — visual progress bar for the checkout wizard.
 *
 * @param {object} props
 * @param {number} props.currentStep - 0-indexed current active step
 * @param {(step: number) => void} props.onStepClick - callback for backward navigation
 * @returns {JSX.Element}
 *
 * Source spec:
 *   Requirement 11.1 — 3 steps (Shipping, Payment, Review), aria-current="step" on active
 *   Requirement 11.2 — allows backward navigation by clicking prior step
 */
const StepIndicator = ({ currentStep, onStepClick }) => {
  return (
    <nav aria-label="Progress" className="mb-8" data-testid="checkout-step-indicator">
      <ol className="flex items-center">
        {STEPS.map((step, idx) => {
          const isCurrent = currentStep === idx;
          const isComplete = currentStep > idx;
          const isClickable = isComplete; // Only allow backward navigation

          return (
            <li key={step.id} className={`relative ${idx !== STEPS.length - 1 ? 'pr-8 sm:pr-20 w-full' : ''}`}>
              {/* Connecting line */}
              {idx !== STEPS.length - 1 && (
                <div
                  className="absolute inset-0 flex items-center"
                  aria-hidden="true"
                >
                  <div className={`h-0.5 w-full ${isComplete ? 'bg-primary' : 'bg-border'}`} />
                </div>
              )}

              {/* Step indicator */}
              <button
                onClick={() => isClickable && onStepClick(idx)}
                disabled={!isClickable}
                className="relative flex h-8 w-8 items-center justify-center rounded-full bg-background group"
                aria-current={isCurrent ? 'step' : undefined}
                data-testid={`step-${step.id}`}
              >
                <span 
                  className={`
                    absolute flex h-8 w-8 items-center justify-center rounded-full border-2 
                    transition-colors duration-300
                    ${isComplete 
                      ? 'border-primary bg-primary' 
                      : isCurrent 
                        ? 'border-primary bg-background' 
                        : 'border-border bg-background'
                    }
                    ${isClickable ? 'group-hover:ring-2 group-hover:ring-ring group-hover:ring-offset-2' : ''}
                  `}
                >
                  {isComplete ? (
                    <Check className="h-4 w-4 text-primary-foreground" aria-hidden="true" />
                  ) : (
                    <span className={`font-mono text-xs ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`}>
                      {idx + 1}
                    </span>
                  )}
                </span>
                
                {/* Visible label on larger screens, hidden on tiny mobile to save space if needed, 
                    but requirement implies clear steps. We'll position it below. */}
                <span 
                  className={`
                    absolute -bottom-6 w-max text-center font-mono text-[10px] uppercase tracking-widest
                    ${isCurrent ? 'text-foreground font-medium' : 'text-muted-foreground'}
                  `}
                >
                  {step.label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default StepIndicator;
