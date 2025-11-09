import {type Metadata} from 'next';
import {type PropsWithChildren} from 'react';

export default function EditorLayout({children}: PropsWithChildren) {
  return children;
}

export const metadata: Metadata = {
  title: 'AI-Powered Profile Picture Editor | magicpfp.com',
  description: 'Create your next profile photo using our AI-powered profile pic studio. Remove photo background with AI and customize your avatar with our free no-signup editor',
};
