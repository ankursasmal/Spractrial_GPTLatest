/**
 * React Native Spectral Chart Component
 * Using Victory Native for interactive spectral data visualization
 * 
 * Installation:
 * npm install victory-native react-native-svg
 * cd ios && pod install
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { 
  VictoryLine, 
  VictoryChart, 
  VictoryAxis,
  VictoryTooltip,
  VictoryVoronoiContainer,
  VictoryZoomContainer,
  VictoryScatter,
  VictoryTheme
} from 'victory-native';

const { width } = Dimensions.get('window');

/**
 * SpectralChart Component
 * @param {Array} spectralData - Array of [wavelength, reflectance] pairs
 * @param {Boolean} enableZoom - Enable zoom and pan functionality
 * @param {String} lineColor - Color of the spectral line
 */
const SpectralChart = ({ 
  spectralData = [], 
  enableZoom = false,
  lineColor = '#2196F3',
  title = 'Spectral Analysis'
}) => {
  // Transform data to Victory format
  const data = spectralData.map(point => ({
    x: point[0], // wavelength
    y: point[1]  // reflectance
  }));

  // Calculate data ranges for better axis formatting
  const wavelengths = data.map(d => d.x);
  const reflectances = data.map(d => d.y);
  const minWavelength = Math.min(...wavelengths);
  const maxWavelength = Math.max(...wavelengths);
  const minReflectance = Math.min(...reflectances);
  const maxReflectance = Math.max(...reflectances);

  // Custom tooltip label
  const getTooltipLabel = ({ datum }) => {
    return `λ: ${datum.x.toFixed(3)} μm\nR: ${datum.y.toFixed(4)}`;
  };

  // Container component based on zoom preference
  const containerComponent = enableZoom ? (
    <VictoryZoomContainer
      zoomDimension="x"
      allowZoom={true}
      allowPan={true}
    />
  ) : (
    <VictoryVoronoiContainer
      labels={getTooltipLabel}
      labelComponent={
        <VictoryTooltip
          style={{ 
            fontSize: 12,
            fill: 'white'
          }}
          flyoutStyle={{ 
            fill: 'rgba(0, 0, 0, 0.8)',
            stroke: 'rgba(255, 255, 255, 0.2)',
            strokeWidth: 1
          }}
          cornerRadius={6}
          pointerLength={8}
        />
      }
      voronoiDimension="x"
      radius={20}
    />
  );

  return (
    <View style={styles.container}>
      {/* Title */}
      {title && (
        <Text style={styles.title}>{title}</Text>
      )}

      {/* Data Info */}
      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          Points: {data.length} | 
          λ: {minWavelength.toFixed(2)}-{maxWavelength.toFixed(2)} μm | 
          R: {minReflectance.toFixed(3)}-{maxReflectance.toFixed(3)}
        </Text>
      </View>

      {/* Chart */}
      <VictoryChart
        width={width - 40}
        height={400}
        theme={VictoryTheme.material}
        containerComponent={containerComponent}
        padding={{ top: 40, bottom: 70, left: 80, right: 40 }}
      >
        {/* X-Axis (Wavelength) */}
        <VictoryAxis
          label="Wavelength (μm)"
          style={{
            axis: { stroke: '#333', strokeWidth: 2 },
            axisLabel: { 
              fontSize: 14, 
              padding: 35, 
              fontWeight: 'bold',
              fill: '#000'
            },
            tickLabels: { 
              fontSize: 11, 
              padding: 5,
              fill: '#333'
            },
            grid: { 
              stroke: '#e0e0e0', 
              strokeDasharray: '2,2',
              strokeWidth: 1
            }
          }}
          tickCount={8}
        />

        {/* Y-Axis (Reflectance) */}
        <VictoryAxis
          dependentAxis
          label="Reflectance"
          style={{
            axis: { stroke: '#333', strokeWidth: 2 },
            axisLabel: { 
              fontSize: 14, 
              padding: 45, 
              fontWeight: 'bold',
              fill: '#000'
            },
            tickLabels: { 
              fontSize: 11, 
              padding: 5,
              fill: '#333'
            },
            grid: { 
              stroke: '#e0e0e0', 
              strokeDasharray: '2,2',
              strokeWidth: 1
            }
          }}
          tickCount={8}
          tickFormat={(t) => t.toFixed(3)}
        />

        {/* Data Line */}
        <VictoryLine
          data={data}
          style={{
            data: { 
              stroke: lineColor, 
              strokeWidth: 2.5 
            }
          }}
          interpolation="linear"
        />

        {/* Data Points (scatter plot) */}
        <VictoryScatter
          data={data}
          size={3}
          style={{
            data: { 
              fill: lineColor,
              stroke: '#fff',
              strokeWidth: 1
            }
          }}
          samples={Math.min(50, data.length)} // Show max 50 points
        />
      </VictoryChart>

      {/* Instructions */}
      {enableZoom && (
        <Text style={styles.instructionText}>
          💡 Pinch to zoom, drag to pan
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 10,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  infoContainer: {
    backgroundColor: '#f5f5f5',
    padding: 8,
    borderRadius: 4,
    marginBottom: 10,
  },
  infoText: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  instructionText: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
    fontStyle: 'italic',
  },
});

export default SpectralChart;

/**
 * USAGE EXAMPLE:
 * 
 * import SpectralChart from './SpectralChartRN';
 * 
 * const MyComponent = () => {
 *   const spectralData = [
 *     [0.4, 0.123],
 *     [0.5, 0.234],
 *     [0.6, 0.345],
 *     // ... more data points
 *   ];
 * 
 *   return (
 *     <View>
 *       <SpectralChart 
 *         spectralData={spectralData}
 *         enableZoom={true}
 *         lineColor="#2196F3"
 *         title="Material Spectral Signature"
 *       />
 *     </View>
 *   );
 * };
 */

/**
 * ADVANCED FEATURES TO ADD:
 * 
 * 1. Multiple Spectra Comparison:
 *    - Add multiple VictoryLine components with different colors
 *    - Add legend using VictoryLegend
 * 
 * 2. Export Functionality:
 *    - Use react-native-view-shot to capture chart as image
 *    - Share via react-native-share
 * 
 * 3. Annotations:
 *    - Use VictoryLabel for marking specific wavelengths
 *    - Add VictoryArea for highlighting regions
 * 
 * 4. Animation:
 *    - Add animate prop to VictoryLine
 *    - Smooth transitions when data changes
 * 
 * 5. Touch Interactions:
 *    - Long press to mark points
 *    - Double tap to reset zoom
 *    - Swipe to switch between spectra
 */

