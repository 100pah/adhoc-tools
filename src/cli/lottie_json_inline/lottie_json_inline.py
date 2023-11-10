#!/usr/bin/env python3

"""
Make lottie JSON refereced image inline.
"""

import getopt
import os
import sys
import json
import base64


_USAGE = r"""
Usage:

    lottie_json_inline.py --input some.json --output result.json
    lottie_json_inline.py --help

"""


class Context(object):
    def __init__(self):
        self.input_file_path = ''
        self.output_file_path = ''


# ------------
# Start: utils
# ------------
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


def print_info_highlight(message):
    print(f'%s%s%s' % (BColors.OKCYAN, message, BColors.ENDC))


def print_usage_exit():
    sys.stdout.write(_USAGE)
    sys.exit(0)


def print_error(ex_or_msg):
    if (isinstance(ex_or_msg, str)):
        sys.stderr.write(f'%s[ERROR]: %s%s\n' % (BColors.FAIL, ex_or_msg, BColors.ENDC))
    else:
        sys.stderr.write(f'%s[ERROR]: %s\n' % (BColors.FAIL, BColors.ENDC))
        print(ex_or_msg)


def handle_error(ex_or_msg, no_usage=False):
    if not no_usage:
        sys.stdout.write(_USAGE)
    print_error(ex_or_msg)
    sys.exit(1)
# ----------
# End: utils
# ----------


def load_lottie_json(ctx):
    all_json_text = ''
    with open(ctx.input_file_path) as json_file:
        all_json_text = json_file.read() # 读整个文件

    lottie_data = None
    try:
        lottie_data = json.loads(all_json_text)
    except json.JSONDecodeError as ex:
        handle_error(ex)
        return

    if not lottie_data:
        handle_error('No data found in JSON file')
        return

    return lottie_data


def write_result(ctx, lottie_data):
    output_dir = os.path.dirname(ctx.output_file_path)
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    result_json_str = json.dumps(lottie_data)
    with open(ctx.output_file_path, 'w') as json_file:
        json_file.write(result_json_str)


def convert(ctx, lottie_data):
    # See https://lottiefiles.github.io/lottie-docs/schema/#/$defs/assets/image
    for asset_obj in lottie_data['assets']:
        img_file_path = asset_obj.get('p')
        is_embedded = asset_obj.get('e')
        if img_file_path is None or is_embedded == 1:
            continue
        img_dir = asset_obj.get('u')
        base_dir = os.path.dirname(ctx.input_file_path)

        img_resolved_path = None
        if img_dir is None:
            img_resolved_path = os.path.normpath(os.path.join(base_dir, img_file_path))
        else:
            img_resolved_path = os.path.normpath(os.path.join(base_dir, img_dir, img_file_path))

        (_, ext) = os.path.splitext(img_file_path)
        data_uri_prefix = 'data:image/' + ext[1:] + ';base64,'

        if not os.path.exists(img_resolved_path):
            handle_error(f'Image not found: {img_resolved_path}')
        with open(img_resolved_path, 'rb') as img_file:
            img_data = img_file.read()
            img_base64 = base64.b64encode(img_data).decode('utf-8')
            asset_obj['p'] = data_uri_prefix + img_base64

        asset_obj['e'] = 1
        asset_obj['u'] = ''


def parse_args(ctx, args):
    opts = []

    try:
        (opts, _) = getopt.getopt(args, 'h:', [
                'help', 'input=', 'output='])
    except getopt.GetoptError as e:
        handle_error('Invalid arguments: {}'.format(e))

    for (opt, val) in opts:
        if opt in ('-h', '--help'):
            handle_error(None)
        elif opt in ('--input'):
            ctx.input_file_path = val
        elif opt in ('--output'):
            ctx.output_file_path = val

    if not ctx.input_file_path:
        handle_error('No --input specified')
    if not ctx.output_file_path:
        handle_error('No --output specified')


def main():
    ctx = Context()
    parse_args(ctx, sys.argv[1:])

    lottie_data = load_lottie_json(ctx)
    convert(ctx, lottie_data)
    write_result(ctx, lottie_data)

    print_info_highlight('result: %s' % ctx.output_file_path)
    print_info_highlight('Done.')


__all__ = ['main']

if __name__ == '__main__':
    main()
