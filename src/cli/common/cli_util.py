#!/usr/bin/env python3

import os
import sys
import subprocess
import socket
import contextlib
import importlib.util
import importlib.machinery
import tempfile
import urllib.request
import shutil
import tarfile
import pathlib


class BColors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'


_USAGE = ''
_DELETE_GUARD_PATH = None

def set_usage(usage):
    global _USAGE
    _USAGE = usage


def set_delete_guard(delete_guard_path):
    global _DELETE_GUARD_PATH
    _DELETE_GUARD_PATH = delete_guard_path


def print_info_highlight(message):
    print('%s%s%s' % (BColors.OKCYAN, message, BColors.ENDC))


def print_usage_exit():
    assert _USAGE
    sys.stdout.write('%s%s%s' % (BColors.OKCYAN, _USAGE, BColors.ENDC))
    sys.exit(0)


def print_error(ex_or_msg):
    if (isinstance(ex_or_msg, str)):
        sys.stderr.write(f'%s[ERROR]: %s%s\n' % (BColors.FAIL, ex_or_msg, BColors.ENDC))
    else:
        sys.stderr.write(f'%s[ERROR]: %s\n' % (BColors.FAIL, BColors.ENDC))
        print(ex_or_msg)


def print_error_exit(ex_or_msg, no_usage=False):
    if not no_usage:
        assert _USAGE
        sys.stdout.write('%s%s%s' % (BColors.OKCYAN, _USAGE, BColors.ENDC))
    print_error(ex_or_msg)
    sys.exit(1)


def cmd_display_and_exec(cmd, display=True):
    """
    Print and exec shell command.
    Args:
        display: if True, print command before exec.
    """
    if display:
        print('%s%s%s' % (BColors.OKBLUE, cmd, BColors.ENDC))
    subprocess.check_call(cmd, shell=True)


def cmd_display_and_exec_return(cmd, display=True, check=True):
    """
    Print and exec shell command, get return value.
    Args:
        display: if True, print command before exec.
        check: if True, raise exception if return code is not 0.
    Returns:
        string from stdout of the command.
    """
    if display:
        print('%s%s%s' % (BColors.OKBLUE, cmd, BColors.ENDC))
    return subprocess.run(cmd, stdout=subprocess.PIPE, shell=True,
                          timeout=None, check=check).stdout.decode()


def find_free_port():
    """
    @see https://stackoverflow.com/questions/1365265/on-localhost-how-do-i-pick-a-free-port-number
    """
    with contextlib.closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as s:
        s.bind(('', 0))
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        return s.getsockname()[1]


def import_from_file(module_name, file_path, caller=None, add_sys_path=False):
    """
    Usage:
        my_module = import_from_file('my_module_name', 'file/path/absolute/or/relative/to/cwd')
        my_module = import_from_file(
                module_name='my_module_name',
                file_path='file/path/absolute/or/relative/to/__file__',
                caller=__file__,
                add_sys_path=True)
    """
    if module_name in sys.modules:
        return sys.modules[module_name]

    assert file_path
    assert not file_path.endswith(os.path.sep)
    if caller is not None:
        assert not caller.endswith(os.path.sep)
        file_path = os.path.normpath(os.path.join(os.path.dirname(caller), file_path))

    loader = importlib.machinery.SourceFileLoader(module_name, file_path)
    spec = importlib.util.spec_from_loader(module_name, loader)
    if spec is None or spec.loader is None:
        raise ImportError('Can not load module named %s from %s' % module_name, file_path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module

    if add_sys_path:
        sys.path.append(os.path.dirname(file_path))

    spec.loader.exec_module(module)

    return module


def del_file_or_dir(target_path):
    # Ensure the third_party_dir_path is in the project directory for safety deletion.
    assert _DELETE_GUARD_PATH is not None
    assert os.path.isabs(_DELETE_GUARD_PATH) and (pathlib.Path(_DELETE_GUARD_PATH) in pathlib.Path(target_path).parents)
    if os.path.isdir(target_path):
        shutil.rmtree(target_path)
    elif os.path.isfile(target_path):
        os.remove(target_path)


@contextlib.contextmanager
def temporary_directory(base):
    tmpdir = tempfile.mkdtemp(prefix='t', dir=base)
    try:
        yield tmpdir
    finally:
        del_file_or_dir(tmpdir)


def ensure_third_party_installed(third_party_dir_path, intaller, force=False):
    intalled_flag = os.path.join(third_party_dir_path, '.installed_as_parent_third_party.flag')
    if not force and os.path.isfile(intalled_flag):
        return
    if os.path.isdir(third_party_dir_path):
        del_file_or_dir(third_party_dir_path)
    try:
        intaller()
        # Drop a flag file.
        with open(intalled_flag, 'w') as f:
            f.write('This flag file is dropped by build script to indicate the third party is installed.')
    except Exception as ex:
        # Clean up the directory if failed.
        del_file_or_dir(third_party_dir_path)
        print_error_exit(ex, True)


def ensure_downloaded(url, target_file_path, force=False):
    assert not target_file_path.endswith(os.path.sep)
    target_dir = os.path.dirname(target_file_path)
    if not os.path.exists(target_dir):
        os.makedirs(target_dir)

    if os.path.exists(target_file_path):
        if force:
            os.remove(target_file_path)
        else:
            return

    try:
        print('Downloading from {} to {} ...'.format(url, target_file_path))
        url = urllib.request.urlopen(url)
        with open(target_file_path, 'wb') as file:
            while True:
                buf = url.read(4096)
                if not buf:
                    break
                file.write(buf)
        print('Downloaded')
    except Exception as ex:
        raise Exception(
            'Download {} failed. Error: {} \n\n'.format(url, ex)
            + 'Please check your network. Or download it manually and put it in {}'.format(target_file_path)
        )


def ensure_tar_uncompressed(archive_path, target_dir, archive_inner_root_dir_name=None):
    assert not archive_path.endswith(os.path.sep)
    assert not target_dir.endswith(os.path.sep)
    if os.path.exists(target_dir):
        raise Exception('uncompress target dir {} already exists.'.format(target_dir))
    archive_dir = os.path.dirname(archive_path)
    print('Uncompressing {} to {} ...'.format(archive_path, target_dir))
    with temporary_directory(archive_dir) as tmp_dir:
        uncompressed_dir = os.path.join(tmp_dir, 'd')
        with tarfile.open(archive_path, 'r') as tar_ref:
            tar_ref.extractall(path=uncompressed_dir)
        if archive_inner_root_dir_name:
            uncompressed_dir = os.path.join(uncompressed_dir, archive_inner_root_dir_name)
            assert os.path.isdir(uncompressed_dir)
        target_dir_parent = os.path.dirname(target_dir)
        if not os.path.exists(target_dir_parent):
            os.makedirs(target_dir_parent)
        os.rename(uncompressed_dir, target_dir)
    print('Uncompress done')


__all__ = [
        'BColors',
        'set_usage',
        'print_info_highlight',
        'print_usage_exit',
        'print_error',
        'print_error_exit',
        'cmd_display_and_exec',
        'cmd_display_and_exec_return',
        'find_free_port',
        'import_from_file',
        ]
