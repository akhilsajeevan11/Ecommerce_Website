import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

const Slider = React.forwardRef(({ className, defaultValue, value, style, ...props }, ref) => {
  const values = value || defaultValue || [0]

  return (
    <SliderPrimitive.Root
      ref={ref}
      style={{
        position: 'relative',
        display: 'flex',
        width: '100%',
        touchAction: 'none',
        userSelect: 'none',
        alignItems: 'center',
        ...style
      }}
      value={value}
      defaultValue={defaultValue}
      {...props}
    >
      <SliderPrimitive.Track
        style={{
          position: 'relative',
          height: '2px',
          width: '100%',
          flexGrow: 1,
          background: '#e5e5e5',
          borderRadius: 0
        }}
      >
        <SliderPrimitive.Range
          style={{
            position: 'absolute',
            height: '100%',
            background: '#000'
          }}
        />
      </SliderPrimitive.Track>
      {values.map((_, i) => (
        <SliderPrimitive.Thumb
          key={i}
          style={{
            display: 'block',
            height: '14px',
            width: '14px',
            background: '#000',
            borderRadius: '50%',
            cursor: 'pointer',
            border: 'none',
            outline: 'none'
          }}
        />
      ))}
    </SliderPrimitive.Root>
  )
})
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
