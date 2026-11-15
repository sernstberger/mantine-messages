import { MdxNpmScript } from './MdxNpmScript';

interface MdxInstallScriptProps {
  packages: string;
  dev?: boolean;
}

export function InstallScript({ packages, dev }: MdxInstallScriptProps) {
  // https://github.com/mantinedev/mantine/pulls?q=is%3Apr+pnpm

  return (
    <MdxNpmScript
      yarnScript={`yarn add ${dev ? '--dev ' : ''}${packages}`}
      npmScript={`npm install ${dev ? '--save-dev ' : ''}${packages}`}
    />
  );
}
