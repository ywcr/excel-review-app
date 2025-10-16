#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
服装季节合规检测工具
检测图片中人员的服装是否符合季节要求（夏装/冬装）
"""

import cv2
import numpy as np
from ultralytics import YOLO
import argparse
from pathlib import Path
import csv
from datetime import datetime

def calculate_skin_exposure(person_region):
    """
    计算皮肤暴露程度
    通过分析肤色区域占比来判断短袖还是长袖
    """
    # 转换为HSV色彩空间
    hsv = cv2.cvtColor(person_region, cv2.COLOR_BGR2HSV)
    
    # 肤色范围（多个范围以适应不同肤色）
    skin_ranges = [
        # 浅肤色
        ((0, 20, 70), (20, 150, 255)),
        # 中等肤色
        ((0, 30, 60), (30, 170, 255)),
    ]
    
    skin_mask = np.zeros(hsv.shape[:2], dtype=np.uint8)
    for lower, upper in skin_ranges:
        mask = cv2.inRange(hsv, np.array(lower), np.array(upper))
        skin_mask = cv2.bitwise_or(skin_mask, mask)
    
    # 计算肤色比例
    total_pixels = person_region.shape[0] * person_region.shape[1]
    skin_pixels = np.count_nonzero(skin_mask)
    skin_ratio = skin_pixels / total_pixels if total_pixels > 0 else 0
    
    return skin_ratio

def calculate_brightness(person_region):
    """
    计算服装亮度
    夏装通常更浅色/明亮
    """
    gray = cv2.cvtColor(person_region, cv2.COLOR_BGR2GRAY)
    return np.mean(gray)

def analyze_clothing_season(person_region):
    """
    分析服装季节特征
    返回: (season_type, confidence)
    - season_type: 'summer' 或 'winter'
    - confidence: 置信度 0-1
    """
    skin_ratio = calculate_skin_exposure(person_region)
    brightness = calculate_brightness(person_region)
    
    # 判断逻辑
    # 高皮肤暴露 + 高亮度 = 夏装
    # 低皮肤暴露 + 低亮度 = 冬装
    
    summer_score = 0
    winter_score = 0
    
    # 皮肤暴露评分
    if skin_ratio > 0.15:  # 短袖或更多暴露
        summer_score += 0.6
    elif skin_ratio < 0.08:  # 长袖覆盖
        winter_score += 0.6
    else:
        summer_score += 0.3
        winter_score += 0.3
    
    # 亮度评分
    if brightness > 140:  # 浅色服装
        summer_score += 0.4
    elif brightness < 100:  # 深色服装
        winter_score += 0.4
    else:
        summer_score += 0.2
        winter_score += 0.2
    
    if summer_score > winter_score:
        return 'summer', summer_score
    else:
        return 'winter', winter_score

def detect_person_clothing(image_path, expected_season='summer', visualize=False, output_dir=None):
    """
    检测图片中人员服装是否符合季节要求
    
    参数:
        image_path: 图片路径
        expected_season: 期望的季节 'summer' 或 'winter'
        visualize: 是否保存可视化结果
        output_dir: 可视化结果保存目录
    
    返回:
        dict: 检测结果
    """
    # 加载YOLOv8模型
    model = YOLO('yolov8n.pt')
    
    # 读取图片
    image = cv2.imread(str(image_path))
    if image is None:
        return {'error': f'无法读取图片: {image_path}'}
    
    # 检测人员
    results = model(image, classes=[0])  # class 0 = person
    
    detections = []
    
    for result in results:
        boxes = result.boxes
        
        if len(boxes) == 0:
            return {
                'image': str(image_path),
                'persons_detected': 0,
                'compliant': None,
                'message': '未检测到人员'
            }
        
        for i, box in enumerate(boxes):
            # 获取边界框
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            conf = float(box.conf[0])
            
            # 提取人员区域
            person_region = image[y1:y2, x1:x2]
            
            # 分析服装季节
            detected_season, season_conf = analyze_clothing_season(person_region)
            
            # 判断是否合规
            is_compliant = (detected_season == expected_season)
            
            detection = {
                'person_id': i + 1,
                'bbox': (x1, y1, x2, y2),
                'detection_conf': conf,
                'detected_season': detected_season,
                'season_confidence': season_conf,
                'compliant': is_compliant
            }
            detections.append(detection)
            
            # 可视化
            if visualize:
                color = (0, 255, 0) if is_compliant else (0, 0, 255)
                cv2.rectangle(image, (x1, y1), (x2, y2), color, 2)
                
                label = f"Person {i+1}: {detected_season} ({season_conf:.2f})"
                status = "✓ 合规" if is_compliant else "✗ 不合规"
                
                cv2.putText(image, label, (x1, y1 - 25), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
                cv2.putText(image, status, (x1, y1 - 5), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
    
    # 保存可视化结果
    if visualize and output_dir:
        output_dir = Path(output_dir)
        output_dir.mkdir(exist_ok=True)
        output_path = output_dir / f"{Path(image_path).stem}_result.jpg"
        cv2.imwrite(str(output_path), image)
    
    # 整体合规性
    all_compliant = all(d['compliant'] for d in detections)
    
    return {
        'image': str(image_path),
        'persons_detected': len(detections),
        'expected_season': expected_season,
        'detections': detections,
        'compliant': all_compliant,
        'message': '所有人员合规' if all_compliant else '存在不合规人员'
    }

def batch_detect(image_dir, expected_season='summer', visualize=False, output_csv=None):
    """
    批量检测文件夹中的所有图片
    """
    image_dir = Path(image_dir)
    image_files = list(image_dir.glob('*.jpg')) + list(image_dir.glob('*.png')) + list(image_dir.glob('*.jpeg'))
    
    if len(image_files) == 0:
        print(f"错误: 在 {image_dir} 中未找到图片")
        return
    
    results = []
    output_dir = image_dir / 'detection_results' if visualize else None
    
    print(f"开始批量检测 {len(image_files)} 张图片...")
    
    for img_path in image_files:
        print(f"处理: {img_path.name}")
        result = detect_person_clothing(img_path, expected_season, visualize, output_dir)
        results.append(result)
    
    # 统计
    total_images = len(results)
    compliant_images = sum(1 for r in results if r.get('compliant') == True)
    no_person = sum(1 for r in results if r.get('persons_detected') == 0)
    
    print("\n" + "="*60)
    print(f"批量检测完成:")
    print(f"  总图片数: {total_images}")
    print(f"  检测到人员的图片: {total_images - no_person}")
    print(f"  合规图片数: {compliant_images}")
    print(f"  不合规图片数: {total_images - no_person - compliant_images}")
    print(f"  未检测到人员: {no_person}")
    print("="*60)
    
    # 保存CSV报告
    if output_csv:
        with open(output_csv, 'w', newline='', encoding='utf-8-sig') as f:
            writer = csv.writer(f)
            writer.writerow(['图片', '检测人数', '期望季节', '合规状态', '备注'])
            
            for result in results:
                writer.writerow([
                    Path(result['image']).name,
                    result.get('persons_detected', 0),
                    result.get('expected_season', ''),
                    '合规' if result.get('compliant') else '不合规',
                    result.get('message', '')
                ])
        
        print(f"\n报告已保存至: {output_csv}")
    
    if visualize and output_dir:
        print(f"可视化结果已保存至: {output_dir}")
    
    return results

def main():
    parser = argparse.ArgumentParser(description='服装季节合规检测工具')
    parser.add_argument('--image', type=str, help='单张图片路径')
    parser.add_argument('--dir', type=str, help='图片文件夹路径（批量处理）')
    parser.add_argument('--season', type=str, default='summer', 
                       choices=['summer', 'winter'], help='期望的季节（默认: summer）')
    parser.add_argument('--visualize', action='store_true', help='保存可视化结果')
    parser.add_argument('--output-csv', type=str, help='保存CSV报告路径')
    
    args = parser.parse_args()
    
    if args.image:
        # 单张图片检测
        output_dir = Path(args.image).parent / 'detection_results' if args.visualize else None
        result = detect_person_clothing(args.image, args.season, args.visualize, output_dir)
        
        print("\n" + "="*60)
        print(f"图片: {result['image']}")
        print(f"检测到人数: {result['persons_detected']}")
        print(f"期望季节: {args.season}")
        
        if result['persons_detected'] > 0:
            for det in result['detections']:
                print(f"\n人员 {det['person_id']}:")
                print(f"  检测到的季节: {det['detected_season']}")
                print(f"  置信度: {det['season_confidence']:.2f}")
                print(f"  合规状态: {'✓ 合规' if det['compliant'] else '✗ 不合规'}")
        
        print(f"\n整体结果: {result['message']}")
        print("="*60)
        
        if args.visualize and output_dir:
            print(f"\n可视化结果已保存至: {output_dir}")
    
    elif args.dir:
        # 批量检测
        batch_detect(args.dir, args.season, args.visualize, args.output_csv)
    
    else:
        parser.print_help()
        print("\n错误: 必须指定 --image 或 --dir")

if __name__ == '__main__':
    main()
