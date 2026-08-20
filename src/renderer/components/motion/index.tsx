import { Flex, FlexProps } from '@feishin/ui/components/flex/flex';
import { Group, GroupProps } from '@feishin/ui/components/group/group';
import { Stack, StackProps } from '@feishin/ui/components/stack/stack';
import { motion } from 'motion/react';

export const MotionFlex = motion.create<FlexProps>(Flex, { forwardMotionProps: true });

export const MotionGroup = motion.create<GroupProps>(Group, { forwardMotionProps: true });

export const MotionStack = motion.create<StackProps>(Stack, { forwardMotionProps: true });

export const MotionDiv = motion.div;
