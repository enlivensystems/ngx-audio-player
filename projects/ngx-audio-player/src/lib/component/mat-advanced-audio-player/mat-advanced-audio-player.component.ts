import {
    Component,
    OnInit,
    Input,
    ViewChild,
    Output,
    EventEmitter
} from '@angular/core';
import { AudioPlayerService } from '../../service/audio-player-service/audio-player.service';
import { Track } from '../../model/track.model';
import { BaseAudioPlayerFunctions } from '../base/base-audio-player-components';
import { MatSlider } from '@angular/material/slider';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import {DeviceDetectorService} from 'ngx-device-detector';

@Component({
    selector: 'mat-advanced-audio-player',
    templateUrl: './mat-advanced-audio-player.component.html',
    styleUrls: ['./mat-advanced-audio-player.component.css']
})
export class MatAdvancedAudioPlayerComponent extends BaseAudioPlayerFunctions implements OnInit {

    displayedColumns: string[] = ['title', 'status', 'functions'];
    timeLineDuration: MatSlider;

    dataSource = new MatTableDataSource<Track>();

    paginator: MatPaginator;

    playlistData: Track[] = [];

    Infinity = Infinity;

    @Input()
    displayTitle = true;

    @Input()
    displayPlaylist = true;

    @Input()
    pageSizeOptions = [10, 20, 30];

    @Input()
    expanded = true;

    @Input()
    autoPlay = false;

    @Input()
    displayVolumeControls = true;

    @Input()
    audioLoadingErrorText = 'Failed to load: ';
    @Input()
    audioLoadingInProgressText = 'Please wait while the audio is loading: ';

    @Input()
    clearPlaylistText = 'Clear playlist';

    @Input()
    errorColor = '#D65251';
    @Input()
    errorText = 'Failed to load the song, click here to try again!';

    @Input()
    removePlaylistElementEnabled = false;

    @Input()
    removePlaylistElementText = 'Remove';

    @Input()
    playlistTitleText = 'Play List';

    @Output()
    clearPlaylist: EventEmitter<void> = new EventEmitter();

    @Output()
    removePlaylistElementByID: EventEmitter<string> = new EventEmitter();

    @Output()
    playerLoadError: EventEmitter<any> = new EventEmitter();

    audioLoadingError = false;
    playlistTrack: any;
    currentTrack: Track;

    constructor(deviceService: DeviceDetectorService,
                private playlistService: AudioPlayerService) {
        super(deviceService);
    }

    ngOnInit() {
        this.setDataSourceAttributes();
        this.bindPlayerEvent();
        this.player.nativeElement.addEventListener('canplay', () => {
            this.audioLoadingError = false;
        });
        this.player.nativeElement.addEventListener('ended', () => {
            if (this.checkIfSongHasStartedSinceAtleastTwoSeconds()) {
                this.nextSong();
            }
        });
        this.player.nativeElement.addEventListener('error', (event) => {
            console.log('Error while loading audio:');
            console.log(event);
            this.audioLoadingError = true;
            this.playerLoadError.emit(this.playlistTrack);
        });
        this.player.nativeElement.addEventListener('loadstart', () => {
            this.audioLoadingError = false;
        });
        this.player.nativeElement.addEventListener('waiting', () => {
            this.audioLoadingError = false;
        });
        this.playlistService.setPlaylist(this.playlistData);
        this.playlistService.getSubjectCurrentTrack().subscribe((playlistTrack) => {
            this.playlistTrack = playlistTrack;
            if (this.playlistTrack && this.playlistTrack[1]) {
                this.currentTrack = this.playlistTrack[1];
            }
        });
        this.player.nativeElement.currentTime = 0;
        this.playlistService.init();
        if (this.autoPlay) {
            super.play();
        }
    }

    @ViewChild(MatPaginator, { static: false }) set matPaginator(mp: MatPaginator) {
        this.paginator = mp;
        this.setDataSourceAttributes();
    }

    setDataSourceAttributes() {
        let index = 1;
        if (this.playlistData) {
            this.playlistData.forEach(data => {
                data.index = index++;
            });
            this.dataSource = new MatTableDataSource<Track>(this.playlistData);
            this.dataSource.paginator = this.paginator;
        }
    }

    nextSong(): void {
        if (this.displayPlaylist == true
            && (((this.playlistService.indexSong + 1) % this.paginator.pageSize) === 0
                || (this.playlistService.indexSong + 1) === this.paginator.length)) {
            if (this.paginator.hasNextPage()) {
                this.paginator.nextPage();
            } else if (!this.paginator.hasNextPage()) {
                this.paginator.firstPage();
            }
        }
        this.currentTime = 0;
        this.duration = 0.01;
        this.playlistService.nextSong();
        this.play();
    }

    previousSong(): void {
        this.currentTime = 0;
        this.duration = 0.01;
        if (!this.checkIfSongHasStartedSinceAtleastTwoSeconds()) {
            if (this.displayPlaylist == true
                && (((this.playlistService.indexSong) % this.paginator.pageSize) === 0
                    || (this.playlistService.indexSong) === 0)) {
                if (this.paginator.hasPreviousPage()) {
                    this.paginator.previousPage();
                } else if (!this.paginator.hasPreviousPage()) {
                    this.paginator.lastPage();
                }
            }
            this.playlistService.previousSong();
        } else {
            this.resetSong();
        }
        this.play();
    }

    resetSong(): void {
        this.player.nativeElement.src = this.currentTrack ? this.currentTrack.link : this.playlistTrack[1].link;
    }

    retryOrPlay(): void {
        if (!this.audioLoadingError) {
            this.playBtnHandler();
        } else {
            this.nextSong();
            // @note These do not work for retrying the current song!
            // this.previousSong();
            // this.currentTime = 0;
            // this.duration = 0.01;
            // this.play();
        }
    }

    selectTrack(index: number): void {
        this.playlistService.selectATrack(index);
        setTimeout(() => {
            this.player.nativeElement.play();
        }, 0);
    }

    /*
    Should be called when the playlist changes. Sets GUI elements without resetting the current state.
     */
    setPlaylist(playlist: Track[]): void {
        // If the new playlist is empty, pause
        if (playlist !== undefined &&
            playlist.length === 0) {
            this.player.nativeElement.pause();
        }
        // Check if something was removed
        // If something was and it's the currently playing element, pause go to the next song
        if (playlist !== undefined &&
            this.playlistData.length > playlist.length &&
            this.playlistTrack && this.playlistTrack[1] &&
            this.playlistData.find(e => e && e.link === this.playlistTrack[1].link) &&
            !playlist.find(e => e && e.link === this.playlistTrack[1].link)) {
            console.log('Currently playing element was removed from the playlist, pausing going to the next...');
            this.player.nativeElement.pause();
            this.nextSong();
        }
        // Set state and GUI in accordance with the playlist changes.
        this.playlistData = playlist;
        this.setDataSourceAttributes();
        this.playlistService.setPlaylist(this.playlistData);
    }

    checkIfSongHasStartedSinceAtleastTwoSeconds(): boolean {
        return this.player.nativeElement.currentTime > 2;
    }

    @Input()
    set playlist(playlist: Track[]) {
        this.setPlaylist(playlist);
        // this.playlistData = playlist;
        // this.ngOnInit();
    }
}
