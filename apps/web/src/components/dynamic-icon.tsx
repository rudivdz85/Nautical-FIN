import { icons, type LucideProps } from 'lucide-react'

function kebabToPascal(str: string): string {
  return str
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

export function DynamicIcon({ name, ...props }: { name: string } & LucideProps) {
  const pascalName = kebabToPascal(name)
  const Icon = icons[pascalName as keyof typeof icons]
  if (!Icon) return null
  return <Icon {...props} />
}
