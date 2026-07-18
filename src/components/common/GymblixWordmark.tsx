import React from 'react';
import Svg, {Text, Path} from 'react-native-svg';
import {COLORS} from '../../theme';

interface GymblixWordmarkProps {
  width?: number;
  color?: string;
}

// Wordmark used on the splash screen and login header — matches the brand
// SVG (italic "GYMBLIX" + arrow glyph), scaled to a given width.
const GymblixWordmark: React.FC<GymblixWordmarkProps> = ({
  width = 200,
  color = COLORS.primary,
}) => {
  const height = (width / 200) * 50;

  return (
    <Svg width={width} height={height} viewBox="0 0 200 50">
      <Text
        x="10"
        y="35"
        fontFamily="Inter, sans-serif"
        fontWeight="900"
        fontStyle="italic"
        fontSize="32"
        fill={color}
        letterSpacing="-1">
        GYMBLIX
      </Text>
      <Path
        d="M165 10 L180 25 L160 25 L175 40"
        stroke={color}
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

export default GymblixWordmark;
