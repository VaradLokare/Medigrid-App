import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');

const TabBar = ({ state, descriptors, navigation }: any) => {
  const translateValue = useRef(new Animated.Value(0)).current;
  
  const tabWidth = width / state.routes.length;
  
  useEffect(() => {
    animateSlider(state.index);
  }, [state.index]);
  
  const animateSlider = (index: number) => {
    Animated.spring(translateValue, {
      toValue: index * tabWidth,
      useNativeDriver: true,
      damping: 15,
      stiffness: 90,
    }).start();
  };
  
  return (
    <View style={styles.tabContainer}>
      <Animated.View
        style={[
          styles.slider,
          {
            transform: [{ translateX: translateValue }],
            width: tabWidth - 20,
          },
        ]}
      />
      
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name;

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        const iconName = () => {
          switch (route.name) {
            case 'index': return 'home';
            case 'hospital': return 'medical';
            case 'medicine': return 'medkit';
            case 'riskprediction': return 'warning';
            case 'settings': return 'settings';
            default: return 'home';
          }
        };

        return (
          <TouchableOpacity
            key={index}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tabButton}
          >
            <Animated.View style={[
              styles.tabContent,
              { opacity: isFocused ? 1 : 0.7 }
            ]}>
              <Ionicons
                name={iconName()}
                size={24}
                color={isFocused ? '#6A11CB' : '#666'}
              />
              <Text style={[
                styles.tabText,
                { color: isFocused ? '#6A11CB' : '#666' }
              ]}>
                {label}
              </Text>
            </Animated.View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const TabsLayout = () => {
  return (
    <Tabs
      tabBar={props => <TabBar {...props} />}
      screenOptions={{
        headerStyle: {
          backgroundColor: '#6A11CB',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '',
        }}
      />
      <Tabs.Screen
        name="hospital"
        options={{
          title: '',
        }}
      />
      <Tabs.Screen
        name="medicine"
        options={{
          title: '',
        }}
      />
      <Tabs.Screen
        name="riskprediction"
        options={{
          title: '',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
        }}
      />
    </Tabs>
  );
};

const styles = StyleSheet.create({
  tabContainer: {
    flexDirection: 'row',
    height: 70,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    position: 'relative',
  },
  slider: {
    height: 4,
    backgroundColor: '#6A11CB',
    position: 'absolute',
    top: 0,
    left: 10,
    borderRadius: 2,
  },
  tabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabText: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
});

export default TabsLayout;