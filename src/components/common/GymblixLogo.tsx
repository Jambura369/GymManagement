import React from 'react';
import Svg, {
  Circle,
  Polygon,
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
  const bgFill = variant === 'dark' ? '#1A1A1A' : '#F8F7FF';

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="redgrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FF5A57" />
          <Stop offset="1" stopColor="#C62E2D" />
        </LinearGradient>
      </Defs>

      {/* Background circle */}
      <Circle cx="50" cy="50" r="49" fill={bgFill} fillOpacity={0.55} />

      {/* Hexagon: true center cx=50, cy=50 */}
      <Polygon
        points="50,11 75.5,30.5 75.5,69.5 50,89 24.5,69.5 24.5,30.5"
        fill="url(#redgrad)"
      />
      {/* Inner hexagon for depth */}
      <Polygon
        points="50,18 69.5,33 69.5,67 50,82 30.5,67 30.5,33"
        fill="#1A1A1A"
        fillOpacity={0.18}
      />

      {/* G: exactly at true center cx=50, cy=50 */}
      <Text
        x="50"
        y="50"
        fontFamily="Arial Black, sans-serif"
        fontSize="40"
        fontWeight="900"
        textAnchor="middle"
        alignmentBaseline="central"
        fill="#FFFFFF">
        G
      </Text>
    </Svg>
  );
};

export default GymblixLogo;
