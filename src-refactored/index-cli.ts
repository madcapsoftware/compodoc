import { CommanderStatic } from 'commander';

import ConfigurationRepository from './core/repositories/config.repository';

import DisplayEnvironmentVersions from './core/use-cases/display-environment-versions';
import HandleConfigFile from './core/use-cases/handle-config';
import HandleTsconfigFile from './core/use-cases/handle-tsconfig-file';
import ScanFile from './core/use-cases/scan-files';
import ServeFiles from './core/use-cases/serve-files';
import SetupFlags from './core/use-cases/setup-flags';

import I18nEngine from './infrastructure/i18n/i18n.engine';
import Logger from './infrastructure/logging/logger';

const compodocPackageJsonFile = require('../package.json');

process.setMaxListeners(0);

export class CliApplication {
    public isWatching = false;

    public async start() {
        /**
         * Setup flags with commander
         */
        const currentProgram: CommanderStatic = SetupFlags.setup(compodocPackageJsonFile);
        /**
         * Detect config file
         */
        const configExplorerResult = await HandleConfigFile.handle(currentProgram);

        /**
         * Update public configuration with detected config file
         */
        if (configExplorerResult) {
            ConfigurationRepository.update(configExplorerResult);
        }
        /**
         * Update internal configuration
         */
        ConfigurationRepository.init(currentProgram);

        /**
         * Display environement versions : compodoc, TypeScript, Node.js, OS
         */
        DisplayEnvironmentVersions.display(compodocPackageJsonFile);

        if (configExplorerResult) {
            Logger.info(`Using configuration file : ${HandleConfigFile.configFilePath}`);
        } else {
            Logger.warn(`No configuration file found, switching to CLI flags.`);
        }

        if (currentProgram.language && !I18nEngine.supportLanguage(currentProgram.language)) {
            Logger.warn(
                `The language ${currentProgram.language} is not available, falling back to ${I18nEngine.fallbackLanguage}`
            );
        }

        I18nEngine.init(currentProgram.language);

        /**
         * 1. Serve ?
         */
        if (currentProgram.serve) {
            ServeFiles.serve(ConfigurationRepository.internalConfiguration);
            return;
        }

        /**
         * 2. Coverage ?
         */
        if (ConfigurationRepository.internalConfiguration.hasFilesToCoverage) {
            Logger.info('Run documentation coverage test for files');
            return;
        }

        /**
         * 3. Generate ?
         */

        /**
         * Detect tsconfig file
         */
        const tsConfigExplorerResult = await HandleTsconfigFile.handle();

        /**
         * Scan files
         */
        let files;
        ScanFile.scan('').then(scannedFiles => {
            files = scannedFiles;
        });
    }
}
