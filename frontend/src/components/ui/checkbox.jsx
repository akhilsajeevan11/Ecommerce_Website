import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check } from "lucide-react"

const Checkbox = React.forwardRef(({ className, style, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    style={{
      height: '16px',
      width: '16px',
      flexShrink: 0,
      border: '1px solid #000',
      borderRadius: 0,
      background: props.checked || props['data-state'] === 'checked' ? '#000' : '#fff',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      padding: 0,
      ...style
    }}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <Check style={{ height: '14px', width: '14px', strokeWidth: 2.5 }} />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox }
