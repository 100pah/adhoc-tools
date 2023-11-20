#!/usr/bin/env python3

import os
import sys
import subprocess
import socket
import contextlib
import importlib.util
import importlib.machinery


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


def set_usage(usage):
    global _USAGE
    _USAGE = usage


def print_info_highlight(message):
    print('%s%s%s' % (BColors.OKCYAN, message, BColors.ENDC))


def print_usage_exit():
    global _USAGE
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
    global _USAGE
    if not no_usage:
        assert _USAGE
        sys.stdout.write('%s%s%s' % (BColors.OKCYAN, _USAGE, BColors.ENDC))
    print_error(ex_or_msg)
    sys.exit(1)


def cmd_display_and_exec(cmd):
    """ Print and exec shell command. """
    print('%s%s%s' % (BColors.OKBLUE, cmd, BColors.ENDC))
    subprocess.check_call(cmd, shell=True)


def cmd_display_and_exec_return(cmd):
    """ Print and exec shell command, get return value. """
    print('%s%s%s' % (BColors.OKBLUE, cmd, BColors.ENDC))
    return subprocess.check_output(cmd, shell=True).decode()


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
    if caller is not None:
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
