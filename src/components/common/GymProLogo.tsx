import React from 'react';
import Svg, {
  Circle,
  Rect,
  Defs,
  LinearGradient,
  Stop,
  G,
  Path,
} from 'react-native-svg';

interface GymProLogoProps {
  size?: number;
}

const GymProLogo: React.FC<GymProLogoProps> = ({size = 80}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#7C3AED" />
          <Stop offset="0.5" stopColor="#6D28D9" />
          <Stop offset="1" stopColor="#4F46E5" />
        </LinearGradient>
        <LinearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#F59E0B" />
          <Stop offset="1" stopColor="#D97706" />
        </LinearGradient>
        <LinearGradient id="innerGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#8B5CF6" />
          <Stop offset="1" stopColor="#6D28D9" />
        </LinearGradient>
      </Defs>

      {/* Background circle with gradient */}
      <Circle cx="50" cy="50" r="50" fill="url(#bgGrad)" />

      {/* Outer ring accent */}
      <Circle
        cx="50"
        cy="50"
        r="46"
        fill="none"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="1.5"
      />

      {/* === Dumbbell shape === */}
      {/* Left plate glow */}
      <Circle cx="22" cy="50" r="17" fill="rgba(255,255,255,0.12)" />
      {/* Left plate outer rim */}
      <Circle cx="22" cy="50" r="14" fill="white" opacity="0.95" />
      {/* Left plate inner disc */}
      <Circle cx="22" cy="50" r="8" fill="url(#innerGrad)" />
      {/* Left plate center dot */}
      <Circle cx="22" cy="50" r="3" fill="rgba(255,255,255,0.5)" />

      {/* Bar */}
      <Rect
        x="36"
        y="44"
        width="28"
        height="12"
        rx="6"
        fill="white"
        opacity="0.95"
      />
      {/* Bar highlight */}
      <Rect
        x="36"
        y="44"
        width="28"
        height="5"
        rx="4"
        fill="rgba(255,255,255,0.3)"
      />

      {/* Right plate glow */}
      <Circle cx="78" cy="50" r="17" fill="rgba(255,255,255,0.12)" />
      {/* Right plate outer rim */}
      <Circle cx="78" cy="50" r="14" fill="white" opacity="0.95" />
      {/* Right plate inner disc */}
      <Circle cx="78" cy="50" r="8" fill="url(#innerGrad)" />
      {/* Right plate center dot */}
      <Circle cx="78" cy="50" r="3" fill="rgba(255,255,255,0.5)" />

      {/* Gold accent badge (top-right) */}
      <Circle cx="74" cy="26" r="8" fill="url(#goldGrad)" />
      <Circle cx="74" cy="26" r="6" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
      {/* Lightning bolt inside gold badge */}
      <Path
        d="M76 21 L72 27 L75 27 L73 32 L77 25 L74 25 Z"
        fill="white"
        opacity="0.95"
      />
    </Svg>
  );
};

export default GymProLogo;
