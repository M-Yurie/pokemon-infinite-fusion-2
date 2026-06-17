import { Component, computed, signal } from '@angular/core';

export type OsId = 'windows' | 'android' | 'macos';

export interface OsOption {
  id: OsId;
  label: string;
  version: string;
  ext: string;
  downloadUrl: string;
}

export interface InstallStep {
  title: string;
  description: string;
  detail: string;
}

@Component({
  selector: 'app-download',
  imports: [],
  templateUrl: './download.html',
  styleUrl: './download.scss',
})
export class Download {
  readonly selectedOs = signal<OsId>('windows');
  readonly expandedStep = signal<number | null>(null);

  readonly osOptions: OsOption[] = [
    {
      id: 'windows',
      label: 'Windows',
      version: 'Windows 10 / 11',
      ext: '.exe',
      downloadUrl: 'https://download.infinitefusion.net/PokemonInfiniteFusion-Launcher.exe',
    },
    {
      id: 'android',
      label: 'Android',
      version: 'Android',
      ext: '.zip',
      downloadUrl: 'https://www.mediafire.com/file/sv2pu6lzofwbem7/InfiniteFusionAndroid.zip/file',
    },
    {
      id: 'macos',
      label: 'macOS',
      version: 'macOS 14.5+',
      ext: '.zip',
      downloadUrl: 'https://www.mediafire.com/file/jwuzsjceke8lo9d/InfiniteFusion.zip/file',
    },
  ];

  readonly stepsByOs: Record<OsId, InstallStep[]> = {
    windows: [
      {
        title: 'Download and Run the Launcher',
        description: 'Click the download button above to get the launcher. Run the downloaded .exe file.',
        detail: "You may need to run the installer as Administrator if it gets flagged by your antivirus. Right-click the file and select 'Run as administrator'.",
      },
      {
        title: 'Allow the Application',
        description: "Windows will show a SmartScreen warning because it doesn't recognize the file. Click 'More Info', then 'Run Anyway' to launch the launcher.",
        detail: 'This warning is normal for fan-made applications not signed by a major publisher. The launcher is safe to run.',
      },
      {
        title: 'Select the Game and Install Location',
        description: 'In the launcher, select Infinite Fusion: Hoenn and choose where to install it on your PC.',
        detail: 'By default, the install location is set to your Downloads folder. You can change this to any folder you prefer.',
      },
      {
        title: 'Click INSTALL and Wait',
        description: 'Click the INSTALL button and wait for all files to download. This may take several minutes due to the large number of sprite files.',
        detail: 'Do not close the launcher while installing. The progress bar will update as files are downloaded.',
      },
      {
        title: 'Launch the Game',
        description: "Once installed, click BACK to return to the main screen, then press PLAY to start the game.",
        detail: "You can also open the game's install folder and launch it directly with 'InfiniteFusion2.exe'.",
      },
    ],
    android: [
      {
        title: 'Uninstall Joiplay and RPG Maker if Already Installed',
        description: 'If you have any version of Joiplay or RPG Maker already installed, you must uninstall them first. Installing over an existing version will not work.',
        detail: "Go to Settings → Apps → Joiplay → Uninstall. Then go to Settings → Apps → RPG Maker → Uninstall. Most failed installations happen because this step is skipped.",
      },
      {
        title: 'Download the Game Files',
        description: 'Download the Android game files using the button above. Use only this link — files from other sources may be fake or contain malware.',
        detail: "If the download link shows a 403 error, go to the official Discord server and type ?tag mobilealt in the #ask-a-bot channel.",
      },
      {
        title: 'Download PIFAndroidPlugins',
        description: 'Download the required plugin package from the official link below.',
        detail: 'Download link: https://mega.nz/file/fPQR3ZyR#pswfan3UE-hdr0P-6PO7BmnvkYEYW3Rluox2YyLnprk — The game will crash with other versions of Joiplay and RPG Maker. Only use this download.',
      },
      {
        title: 'Extract the Downloaded Files',
        description: 'Install the RAR Extractor Tool from Google Play. Open it, navigate to your Downloads folder, and extract both InfiniteFusionAndroid.zip and PIFAndroidPlugins.zip.',
        detail: "Long-tap InfiniteFusionAndroid.zip and choose 'Extract To InfiniteFusionAndroid/'. Repeat for PIFAndroidPlugins.zip. Extraction may take 45+ minutes due to the large number of sprite files. Be patient.",
      },
      {
        title: 'Install Joiplay',
        description: 'Open your Files app, navigate to the PIFAndroidPlugins folder, and install the Joiplay APK (JoiPlay-1.20.410-patreon-release) first.',
        detail: 'Make sure to install Joiplay BEFORE RPG Maker. The order matters.',
      },
      {
        title: 'Install RPG Maker Plugin',
        description: 'Install the RPG Maker APK (RPGMPlugin-1.20.53-patreon-release.apk) from the same PIFAndroidPlugins folder.',
        detail: 'Only use the APK from the downloaded plugin package. Other versions will cause the game to crash.',
      },
      {
        title: 'Move Save Files (If Applicable)',
        description: "If this is your first time installing, skip this step. If you have an existing save file, move 'File A.rxdata' into the main game folder.",
        detail: "The save file must be named exactly 'File A.rxdata' — case sensitive. 'File_A.rxdata' will not work. If you have multiple save files, copy all of them.",
      },
      {
        title: 'Add the Game to Joiplay',
        description: 'Open Joiplay, navigate to your InfiniteFusion folder, select InfiniteFusion.exe, and tap Choose.',
        detail: 'Note: the executable is named InfiniteFusion.exe, not Game.exe.',
      },
      {
        title: 'Enter Game Name and Version',
        description: 'Joiplay will ask for a Game Name and Version. You can enter anything you want — these fields are not used by the game.',
        detail: 'Any name and any version number works. Just fill in the fields and continue.',
      },
      {
        title: 'Open the Game',
        description: 'Joiplay will now show the game. Tap on InfiniteFusion to launch it.',
        detail: 'Important: once the game is open and you are loaded into a save file, go to Options and set Text Entry to Cursor. Also set Device to Mobile (if already Mobile, switch to PC then back to Mobile and save).',
      },
    ],
    macos: [
      {
        title: 'Check Compatibility',
        description: 'You must be on macOS 14.5 Sonoma or macOS 15 Sequoia. Earlier versions are not supported.',
        detail: 'Also download the game files using the button above. Extract the zip using The Unarchiver app or by double-clicking.',
      },
      {
        title: 'Uninstall Homebrew and Wine Stable (If Installed)',
        description: 'If you already have Homebrew or Wine Stable installed, remove them first to avoid conflicts.',
        detail: 'To uninstall Homebrew, run this command in Terminal (one line): /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/uninstall.sh)" — Then move Wine Stable from Applications to Trash.',
      },
      {
        title: 'Install Homebrew',
        description: 'Open Terminal and run the Homebrew install command.',
        detail: 'Command (one line): /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" — You will be prompted for your Mac password. After installation, follow any instructions Terminal shows to set up Homebrew PATH variables.',
      },
      {
        title: 'Install Wine',
        description: 'In Terminal, run the following command to install Wine via Homebrew.',
        detail: "Command: brew install --cask --no-quarantine wine-stable — If you get an error about an existing binary, open Finder → /opt/homebrew/bin/, delete everything except 'brew', then re-run the command.",
      },
      {
        title: 'Open the Game with Wine',
        description: "Navigate to the InfiniteFusion folder in Finder. Hold Control and click the folder name, then select 'New Terminal at Folder'.",
        detail: "In the terminal that opens, type: wine InfiniteFusion.exe and press Enter. Click Cancel on any security warnings — these are normal for Wine applications.",
      },
      {
        title: 'Play the Game',
        description: "The game will launch through Wine. You're ready to play!",
        detail: 'Save files are stored at: /Users/YOURNAME/.wine/drive_c/users/YOURNAME/AppData/Roaming/infinitefusion — Replace YOURNAME with your Mac username. Access this path in Finder with Command + Shift + G.',
      },
    ],
  };

  readonly currentOs = computed(() => this.osOptions.find((o) => o.id === this.selectedOs())!);
  readonly currentSteps = computed(() => this.stepsByOs[this.selectedOs()]);

  selectOs(id: OsId): void {
    this.selectedOs.set(id);
    this.expandedStep.set(null);
  }

  toggleStep(i: number): void {
    this.expandedStep.update((v) => (v === i ? null : i));
  }
}
