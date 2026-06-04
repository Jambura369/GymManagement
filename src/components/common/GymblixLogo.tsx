import React from 'react';
import Svg, {
  Circle,
  Polygon,
  Path,
  Text,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';

interface GymblixLogoProps {
  size?: number;
  variant?: 'dark' | 'light';
}

const GymblixLogo: React.FC<GymblixLogoProps> = ({size = 80, variant = 'dark'}) => {
  const bgFill = variant === 'dark' ? '#0D0C1A' : '#F8F7FF';
  const gFill = variant === 'dark' ? '#F1F0FF' : '#1A1A2E';

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="brand" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#7C3AED" />
          <Stop offset="1" stopColor="#EC4899" />
        </LinearGradient>
      </Defs>

      {/* Background circle */}
      <Circle cx="50" cy="50" r="49" fill={bgFill} fillOpacity={0.55} />

      {/* Outer hexagon border (pointy-top, center 50,45, R=38) */}
      <Polygon
        points="50,7 82.9,26 82.9,64 50,83 17.1,64 17.1,26"
        fill="none"
        stroke="url(#brand)"
        strokeWidth="2.8"
      />

      {/* Inner hexagon double-border fill */}
      <Polygon
        points="50,13 77.7,29 77.7,61 50,77 22.3,61 22.3,29"
        fill="#7C3AED"
        fillOpacity={0.1}
      />
      <Polygon
        points="50,13 77.7,29 77.7,61 50,77 22.3,61 22.3,29"
        fill="none"
        stroke="url(#brand)"
        strokeWidth="1.2"
        strokeOpacity={0.4}
      />

      {/* Gear mark — sits behind G, visible through G's open right counter */}
      {/* 6-tooth gear, center (63, 43), outer_r=13, inner_r=9.5 */}
      <Path
        d="M 72.38,41.51 L 75.90,41.42 L 75.90,44.58 L 72.38,44.49
           L 68.98,50.38 L 70.82,53.38 L 68.08,54.97 L 66.40,51.87
           L 59.60,51.87 L 57.92,54.97 L 55.18,53.38 L 57.02,50.38
           L 53.62,44.49 L 50.10,44.58 L 50.10,41.42 L 53.62,41.51
           L 57.02,35.62 L 55.18,32.62 L 57.92,31.03 L 59.60,34.13
           L 66.40,34.13 L 68.08,31.03 L 70.82,32.62 L 68.98,35.62 Z"
        fill="url(#brand)"
      />
      {/* Gear center hole */}
      <Circle cx="63" cy="43" r="4.5" fill={bgFill} fillOpacity={0.9} />
      {/* Gear hub ring */}
      <Circle
        cx="63"
        cy="43"
        r="2.8"
        fill="none"
        stroke="url(#brand)"
        strokeWidth="0.8"
        strokeOpacity={0.6}
      />

      {/* G monogram — overlaid on gear, gear shows through G's open right gap */}
      <Text
        x="50"
        y="65"
        fontFamily="Arial Black, sans-serif"
        fontSize="52"
        fontWeight="900"
        textAnchor="middle"
        fill={gFill}>
        G
      </Text>
    </Svg>
  );
};

export default GymblixLogo;
