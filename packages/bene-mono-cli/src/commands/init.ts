import fs from 'fs-extra';
import path from 'path';
import { Command } from 'commander';
import prompts from 'prompts';
import { findMonorepoRoot, downloadTemplate, replaceInFiles } from '../utils/template-utils';

export const initAction = async () => {
  try {
    const cwd = process.cwd();
    console.log(cwd);
    const monorepoRoot = findMonorepoRoot(cwd);

    if (monorepoRoot) {
      console.log(`Monorepo root detected: ${monorepoRoot}`);
      console.log('A new app will be created within the existing monorepo.');
      await initAppAction(monorepoRoot);
    } else {
      await initMonorepoAction(cwd);
    }
  } catch (error) {
    console.error(error);
  }
};

export const init = new Command()
  .name('init')
  .description('Initialize a monorepo project')
  .action(initAction);

const templateChoices = [
  {
    title: 'Turbo v2 | Vite v7  | React v19 | Tailwind v4 | shadcn (Default)',
    value: 'turbo2-vite7-react19-tailwind4-shadcn',
  },
  {
    title: 'Turbo v2 | Vite v7  | React v19 | Tailwind v4 | shadcn | storybook',
    value: 'turbo2-vite7-react19-tailwind4-shadcn-storybook',
  },
  {
    title: 'Turbo v2 | Next v15 | React v19 | Tailwind v4 | shadcn',
    value: 'turbo2-next15-react19-tailwind4-shadcn',
  },
];

const initMonorepoAction = async (cwd: string) => {
  const { templateType, projectName, workspaceAlias } = await prompts([
    {
      type: 'select',
      name: 'templateType',
      message: 'Select a template for the new monorepo:',
      choices: templateChoices,
      initial: 0,
    },
    {
      type: 'text',
      name: 'projectName',
      message: 'Project name:',
      initial: 'my-monorepo',
      format: (value: string) => value.trim(),
      validate: (value: string) =>
        value.length > 128 ? `Name should be less than 128 characters.` : true,
    },
    {
      type: 'text',
      name: 'workspaceAlias',
      message: 'Enter the workspace alias:',
      initial: '@workspace',
    },
  ]);
  console.log(`Selected template: ${templateType}`);
  console.log(`Project name: ${projectName}`);

  if (!templateType || !projectName || !workspaceAlias) {
    console.log('Template type, project name and workspace alias are required. Exiting.');
    process.exit(1);
  }

  const projectPath = path.join(cwd, projectName);
  if (fs.existsSync(path.resolve(cwd, projectName, 'package.json'))) {
    console.error(`A project with the name ${projectName} already exists.`);
    process.exit(1);
  }

  console.log(`Creating a new monorepo project '${projectName}' in ${projectPath}...`);

  try {
    await downloadTemplate({
      templatePath: templateType,
      targetPath: projectPath,
    });

    const packageJsonPath = path.join(projectPath, 'package.json');
    const packageJson = await fs.readJson(packageJsonPath);
    packageJson.name = projectName;
    await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });

    await replaceInFiles(projectPath, '@workspace', workspaceAlias);

    console.log(`Monorepo Project '${projectName}' created successfully.`);
  } catch (error) {
    console.error('Error creating monorepo project:', error);
    await fs.remove(projectPath);
  }
};

async function initAppAction(monorepoRoot: string) {
  const { templateType, appName, workspaceAlias } = await prompts([
    {
      type: 'select',
      name: 'templateType',
      message: 'Select a template for the new app:',
      choices: templateChoices,
      initial: 0,
    },
    {
      type: 'text',
      name: 'appName',
      message: 'What is the name of the new app?',
      initial: 'my-app',
      format: (value: string) => value.trim(),
      validate: (value: string) =>
        value.length > 128 ? `Name should be less than 128 characters.` : true,
    },
    {
      type: 'text',
      name: 'workspaceAlias',
      message: 'Enter the workspace alias:',
      initial: '@workspace',
    },
  ]);
  console.log(`Selected template: ${templateType}`);
  console.log(`App name: ${appName}`);

  if (!appName || !templateType || !workspaceAlias) {
    console.log('Template type, app name and workspace alias are required. Exiting.');
    process.exit(1);
  }

  const appPath = path.join(monorepoRoot, 'apps', appName);
  if (fs.existsSync(appPath)) {
    console.error(`Error: App directory '${appPath}' already exists.`);
    process.exit(1);
  }

  console.log(`Creating a new app '${appName}' in '${appPath}'...`);

  try {
    await downloadTemplate({
      templatePath: `${templateType}/apps/web`,
      targetPath: appPath,
    });

    const packageJsonPath = path.join(appPath, 'package.json');
    const packageJson = await fs.readJson(packageJsonPath);
    packageJson.name = appName;
    await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });

    await replaceInFiles(appPath, '@workspace', workspaceAlias);

    console.log(`App '${appName}' created successfully.`);
  } catch (error) {
    console.error('Error creating app:', error);
    await fs.remove(appPath);
  }
}
